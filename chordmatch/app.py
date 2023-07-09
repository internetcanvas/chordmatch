
import os
import sys
from cgi import parse_qs, escape
import json
import re
import itertools
import traceback

sys.path.insert(0, os.path.dirname(__file__))


semitones = ["1", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7", "", "", "9", "", "", "", "11", "", "", "13"]
octave = ["a", ["bb", "a#"], "b", "c", ["db", "c#"], "d", ["eb", "d#"], "e", "f", ["gb", "f#"], "g", ["ab", "g#"]]
standard = ["e", "a", "d", "g", "b", "e"]

chords = []
with open('./data.json', 'rt') as data:
	chords = json.loads(data.read())


def step(note):
	for i, n in enumerate(octave):
		if n == note or (len(n) > 1 and note in n):
			return i

def notes(frets, offset = 0, flat = True, tuning = standard):
	x = len(frets)
	strings = len(tuning)
	
	if x == 0 or strings == 0 or x > strings: return ""
	
	while (x < strings):
		frets.append("x")
		x += 1
	
	ret = []
	for i, f in enumerate(frets):
		if f not in ["x", -1, None]:
			s = step(tuning[i]) + offset
			oct = octave[(s + f) % len(octave)]
			
			if len(oct) > 1:
				if flat: oct = oct[0]
				else: oct = oct[1]
			ret.append(oct)
			
	return ",".join(ret)

def permute(lst, one):
	inorder = [lst]
	for y, z in enumerate(lst):
		if y > 0: inorder.append(list(inorder[y - 1][-1:]) + inorder[y - 1][:-1])
	
	arr = inorder
	perm = list(itertools.permutations(inorder[0][1:]))
	
	for p in perm:
		alt = [one] + list(p)
		if alt not in arr: arr.append(alt)
		
	return arr

def lookup(params, exact = False):
	all = []
	
	notelist = params.lower().split(",")
	
	if len(notelist) < 2: return all
	
	for ni, nl in enumerate(notelist):
		if nl in ["e#", "fb"]: notelist[ni] = "f"
		elif nl in ["cb", "b#"]: notelist[ni] == "b"
		
	notelist = [x for i, x in enumerate(notelist) if i == notelist.index(x)]
	#print("\t" + str(notelist))
	
	for c in chords:
		#st = [s for s in c["semitones"]]
		st = [semitones.index(z) for z in c["steps"]]
		
		lengths = True
		if len(st) != len(notelist):
			lengths = False
		
		if not exact and lengths == False:
			five = None
			if len(notelist) == len(c["steps"]) - 1 and "5" in c["steps"] and len(c["steps"]) >= 3:
				five = c["steps"].index("5")
				if len(st) > five:
					st.pop(five)
		
					if len(st) != len(notelist): lengths = False
					else: lengths = True
			
		if lengths == False: continue
		
		permtones = permute(st, 0)
		permnotes = permute(notelist, notelist[0])
		
		for nl in permnotes:
			for x, s in enumerate(permtones):
				matches = []
				
				one = nl[x % len(nl)]
				first = step(one)

				#print(nl)
				for i, n in enumerate(nl):
					n = n.strip()
	
					interval = (first + s[i]) % len(octave)

					if len(octave[interval]) > 1:
						if n.endswith("#"): note = octave[interval][1]
						else: note = octave[interval][0]
					else: note = octave[interval]
				
					names = []
					#print(note, n)
					if note == n:
						text = one.title() + " " + c["name"]
						names.append(text)
					
					if len(names) > 0 and len(list(set(names))) == len(names):
						final = names[0]
						if final.startswith(n.title()) and notelist[0] != n: final += " / " + notelist[0].title()
						elif not final.startswith(n.title()): final += " / " + n.title()
						matches.append(final)
			
					if len(matches) >= len(nl): break
				if len(matches) >= len(nl): break

			#print("\t" + str(matches))
			#print(len(matches), len(nl))
			if len(matches) >= len(nl):
				all.append(matches[0])
				break
	
	if len(all) > 1:
		mult = []
		for a in all:
			if re.search("\/", a): mult = [a] + mult
			else: mult = mult + [a]
		all = mult[::-1]
	
	return all


def app(environ, start_response):
	start_response('200 OK', [('Content-Type', 'text/plain')])
	
	qs = parse_qs(environ['QUERY_STRING'])
	
	err = None
	
	notesarg = {}
	for n in ['frets', 'offset', 'flat', 'tuning']: notesarg[n] = None
	
	try:
		if len(qs.get('frets', [])) > 0: notesarg["frets"] = json.loads(qs.get('frets', [])[0])
		if len(qs.get('offset', [])) > 0: notesarg["offset"] = int(escape(qs.get('offset', [None])[0]))
		if len(qs.get('flat', [])) > 0: notesarg["flat"] = bool(escape(qs.get('flat', [None])[0]).strip("False"))
		if len(qs.get('tuning', [])) > 0: notesarg["tuning"] = json.loads(qs.get('tuning', [])[0])

	except Exception as ex:
		err = "Error in parameters." #str(traceback.format_exc())
		
	if not err:
		if len(list(notesarg["frets"])) > len(list(notesarg["tuning"])): err = "Too many notes for tuning."
		elif True in [bool(re.search("[^\d\-]{1,2}", str(f))) for f in list(notesarg["frets"]) if f]: err = "Invalid fret positions."
		elif True in [bool(re.search("[^a-g\#]{1,2}", str(t))) for t in list(notesarg["tuning"]) if t]: err = "Invalid notes in tuning."
	
	if err:
		err = "['" + str(err) + "']"
		return [err.encode()]

	lookuparg = {}
	for l in ['params', 'exact']: lookuparg[l] = None
		
	if len(qs.get('exact', [])) > 0: lookuparg["exact"] = bool(escape(qs.get('exact', [None])[0]).strip("False"))
	
	if len(chords) > 0:
		result = None
		
		try:
			#result = lookup(notes(params["frets"], params["offset"], params["flat"], params["tuning"]), params["exact"])
			lookuparg['params'] = notes(**{k: v for k, v in notesarg.items() if v is not None})
			
			try:
				result = lookup(**{k: v for k, v in lookuparg.items() if v is not None})
				
			except Exception as ex:
				err = "Error in lookup." #str(traceback.format_exc())
			
		except Exception as ex:
			err = "Error in notes." #str(traceback.format_exc())
			
		if result or not err: response = str(result)
		else: response = "['" + str(err) + "']"
	
	return [response.encode()]
	