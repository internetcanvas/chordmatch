
function fit(c) {
	//window.matchMedia("(max-width: 780px)")
	cell = 50;
	
	$("#footer").css("top", 0);
	
	if ($("select[name=display]").css("display") == "none") {
		mobile = -435;
		
		$("table").addClass("vertical").removeClass("horizontal").removeClass("left");
		$("table").css("top", (($("table").height() / 2) - $("form").height() + (cell * 3)) + "px");
		
		if (c < 12) $("table").css("left", (mobile + ((cell / 1.25) * (12 - c))) + "px");
		else $("table").css("left", (mobile - ((cell / 2) * (c - 12))) + "px");

		$("#footer").css("top", $("table").height() - $("form").height());

	} else if ($("select[name=display]").val() == "vertical" 
		|| $("table").width() > $("body").width() - cell 
		|| $("table").height() > $("body").width() - cell) {
		
		$("table").addClass("vertical").removeClass("horizontal").removeClass("left");
		$("table").css("top", "" + (($("table").height() / 2) - ($("table").width() / 2) + $("form").height()) + "px");
		
		if ($("table").height() > $("body").width() - cell) {
			$("table").css("left", (($("body").width() / 2) - ($("table").height() / 2) + (cell / 2)) + "px");
		} else $("table").css("left", "0");
		
		$("#footer").css("top", $("table").height());

	} else {
		$("table").addClass("horizontal").removeClass("vertical").removeClass("left");
		if ($("select[name=display]").val() == "left") $("table").addClass("left");
	}
}

function update(draw = false) {
	r = $("input[name=strings]").val();
	c = $("input[name=frets]").val();
	
	//$("table").attr("class", "").addClass($("select[name=display]").val());
	
	clear = $("input[name=clear]").is(":checked");
	
	octave = ["a", ["bb", "a#"], "b", "c", ["db", "c#"], "d", ["eb", "d#"], "e", "f", ["gb", "f#"], "g", ["ab", "g#"]];
	
	if (draw) {
		if (!clear) prev = active();
		
		$("table tr").remove();
		$("table").append(neck(r, c));
		
		if (!clear) clicked();
	}
	
	if (clear) msg();
	fit(c);
	
	return false;
}

function clicked(e = false) {
	if (e) {
		string = $(e).attr("data-string");
		add = true;
	
		if ($(e).hasClass("selected")) add = false;
		$("a.selected").each(function() {
			if ($(this).attr("data-string") == string) $(this).removeClass("selected");
		});
		if (add) $(e).addClass("selected");
	
		for (a = 1; a <= parseInt($("input[name=strings]").val()); a++) {
			//if (arr.length >= a && arr[a - 1] != -1) continue; //symbol = "&nbsp;&nbsp;";
			//else {
				symbol = "&times;";
				$("table tr#string-" + a + " td:first-child a span:last-child").html(symbol);
			//}
		}
	}
	
	arr = active();
	for (a = 0; a < arr.length; a++) {
		if (!arr[a]) arr[a] = -1;
	}
	
	app = ""
	if (arr.length > 0) {
		app = "frets=[" + arr.toString() + "]&offset=0&flat=" + $("select[name=notation]").val() 
			+ "&tuning=" + $("select[name=tuning]").val().replace(/\'/g, '"').replace(/\#/g, "%23") 
			+ "&exact=" + $("select[name=exact]").val();
	}
	
	result = "None";
	//if (arr.filter(val => val !== "-1").length >= 2) {
	if ($("td a.selected").length > 1) {
		lookup = $.get("/lookup?" + app, function(text) {
			text = text.replace(/\'/g, "").replace(/\[|\]/g, ""); //.replace(/\,/g, ",<br>");
			result = "<span>" + text.replace(/\,/g, "</span><span>").replace(/^$/, "None") + "</span>";
			
			//if ($("td a.selected").length > 1) {
				$("#output").html("<big>" + result + "</big>");
			//}
		});
	} else msg();
	
	return false;
}

function active() {
	arr = [];
	$("a.selected").each(function() {
		arr[$(this).attr("data-string") - 1] = $(this).attr("data-fret");
	});
	return arr;
}

function btn(r, c, t) {
	html = '<a href="#" data-string="' + r.toString() + '" data-fret="' + c.toString() + '"';
	
	if (!clear) {
		//prev = active();
		//if (prev.length > r) {
			//console.log(r, c, prev[r - 1]);
			if (prev[r - 1] == c) html += ' class="selected"';
		//}
	}
	
	html += ' onclick="return clicked($(this));">'
	
	if (t == "") html += note(r, c);
	else html += t;
	
	html += '</a>';
	
	return html;
}

function note(r, c) {
	//start = $("#string-" + (r + 1) + " td:first-child a span:first-child").html();
	start = $("select[name=tuning]").val().replace(/\'|\[|\]/g, "").split(",")[r - 1];

	if ($("select[name=notation]").val() == "False") idx = 1;
	else idx = 0;

	name = "";
	for (i = 0; i < octave.length; i++) {
		if (octave[i] == start || (start == octave[i][0] || start == octave[i][1])) {
			name = octave[(i + c) % octave.length];
			break;
		}
	}

	if (name.indexOf(",") != -1) name = name.split(",")[idx];
	name = name.charAt(0).toUpperCase() + name.charAt(1);
	
	span = '<span';
	if (name.charAt(1) != "") span += ' class="shift"';
	span += '>' + name + '</span>';
	return span;
}

function fret(y, x, r) {
	scale = 25.5;
	ratio = 17.817;
	
	start = y;
	if (parseInt($("input[name=offset]").val()) >= 1) {
		start += parseInt($("input[name=offset]").val());
	}
	
	extra = "";
	if (r == x) {
		extra += '<span>' + start.toString() + '</span>';
	}
	
	notes = pretty($("select[name=tuning]").val());
	
	if (y == 0) {
		width = scale;
		px = "50px;";
	} else if (x == r) {
		size = width / ratio;
		width -= size;
		px = (size * 90) + "px;";
	} else px = "";
	
	t = ""
	if (y == 0) {
		t += '<span>' + notes[x - 1] + '</span>'
		t += '<span>&times;</span>'
	}
	
	style = 'style="';
	if (px != "") style += 'min-width: ' + px;
	if (x > 0) style += 'border-bottom-width: ' + ((r - x) + 3) + 'px;';
	style += '"';
	
	if (x == 0) html = '<td ' + style + '></td>';
	else html = '<td ' + style + '>' + extra + btn(x, start, t) + '</td>';
	
	return html;
}

function neck(r, c) {
	html = ""
	for (x = r; x >= 0; x--) {
		html += '<tr id="string-' + x + '">';
		
		for (y = 0; y <= c; y++) {
			html += fret(y, x, r);
		}
		
		html += '</tr>';
	}
	return html;
}

function pretty(val) {
	notes = val.replace(/\'|\[|\]/g, "").split(",");
	for (n = 0; n < notes.length; n++) {
		notes[n] = notes[n].trim().charAt(0).toUpperCase() + notes[n].trim().substring(1, notes[n].length);
	}
	return notes;
}

function tune() {
	str = $("input[name=strings]").val();
	//console.log(typeof str, tunings[str]);
	
	$("select[name=tuning] optgroup:first-child option").remove();
	for (t = 0; t < tunings[str].length; t++) {
		val = "['" + tunings[str][t].notes.join("','") + "']";
		selected = (t == 0) ? "selected" : "";
		$("select[name=tuning] optgroup:first-child").append('<option value="' + val + '" ' + selected + '>' + tunings[str][t].name + '</option>');
	}

	cust = "";
	$("select[name=tuning] optgroup:last-child option:not(:first-child)").each(function() {
		cust += $(this).val() + ";";
	}).remove();
	
	if ($("table tr").length > 0 && cust != "") {
		$("select[name=tuning]").attr("data-" + ($("table tr").length - 1).toString(), cust);
	}
	
	if ($("select[name=tuning]").attr("data-" + str)) {
		prev = $("select[name=tuning]").attr("data-" + str).split(";");
		
		for (p in prev) {
			if (prev[p].trim() != "") {
				$("select[name=tuning] optgroup:last-child").append('<option value="' + prev[p] + '">' + pretty(prev[p]).join(" ") + '</option>');
			}
		}
	}
}

function ask() {
	notes = prompt("Enter " + $("input[name=strings]").val() + " notes, space separated:");
	
	if (notes) {
		if (notes.toLowerCase().replace(/([^a-g\#\s\,])/g, "").length != notes.length) {
			alert("Those were some invalid characters.");
			notes = false;
			
		} else if (notes.toLowerCase().replace(/([a-g\#]){3,}/g, "").length != notes.length 
			|| notes.toLowerCase().replace(/(cb|b\#|fb|e\#)/g, "").length != notes.length 
			|| notes.replace(/(\s\#)/g, "").length != notes.length 
			|| notes.replace(/^\#/, "").length != notes.length) {
			alert("Those were some invalid notes.");
			notes = false;
			
		} else if (notes.toLowerCase().replace(/(\,)+/g, "").split(/\s+/).length.toString() != $("input[name=strings]").val()) {
			alert("That's not the right number of strings.");
			notes = false;
			
		} else {
			$("select[name=tuning] option[selected]").removeAttr("selected");
		
			//tuning = "['" + notes.replace(/(\s?\,\s?)/g, "','") + "']";
			tuning = "['" + notes.toLowerCase().replace(/([^a-g\#\s])/g, "").replace(/(\s+)/g, "','") + "']";

			disp = notes.toLowerCase().replace(/(\,+)/g, "").split(/\s+/);
			conv = ""
			for (d in disp) conv += disp[d].charAt(0).toUpperCase() + disp[d].charAt(1) + " ";
			
			$("select[name=tuning] optgroup:last-child").append('<option value="' + tuning + '" selected>' + conv + '</option>');
		
			return true;
		}
	}
	
	if (!notes) {
		$("select[name=tuning]").val($("select[name=tuning] option[selected]").val());
	}
	
	return false;
}

function msg() {
	$("#output").html("<big>" + $("#output").attr("data-default") + "</big>");
}

$(document).ready(function() {
	msg();
	
	tune();

	update(true);
});

$(window).on("resize", function() {
	fit($("input[name=frets]").val());
});
