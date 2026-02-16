/* ============================================================================
   Special Events System
   Injects themed decorations (CSS + HTML) into any active template.
   Controlled via streamerBotArgs['specialEvent'] or auto-activated by date.
   ============================================================================ */

/* --- Theme Registry ------------------------------------------------------- */

var specialEventThemes = [];

function registerSpecialEventTheme(theme) {
	specialEventThemes.push(theme);
}

/* --- Helper: date range check --------------------------------------------- */

function isDateInRange(monthStart, dayStart, monthEnd, dayEnd) {
	var now = new Date();
	var month = now.getMonth() + 1; // 1-12
	var day = now.getDate();

	if (monthStart < monthEnd || (monthStart === monthEnd && dayStart <= dayEnd)) {
		// Range does not wrap around year boundary
		if (month > monthStart || (month === monthStart && day >= dayStart)) {
			if (month < monthEnd || (month === monthEnd && day <= dayEnd)) {
				return true;
			}
		}
		return false;
	} else {
		// Range wraps around year boundary (e.g. Dec 20 - Jan 5)
		if (month > monthStart || (month === monthStart && day >= dayStart)) {
			return true;
		}
		if (month < monthEnd || (month === monthEnd && day <= dayEnd)) {
			return true;
		}
		return false;
	}
}

/* --- Helper: resolve active theme ----------------------------------------- */

function getActiveSpecialEvent(streamerBotArgs) {
	// 1. Explicit override from StreamerBot sub-action arg
	if (streamerBotArgs && 'specialEvent' in streamerBotArgs) {
		var requested = streamerBotArgs['specialEvent'];

		// "none" disables all themes
		if (requested === 'none') {
			return null;
		}

		// Find matching theme by name
		for (var i = 0; i < specialEventThemes.length; i++) {
			if (specialEventThemes[i].name === requested) {
				return specialEventThemes[i];
			}
		}

		// Unknown theme name — no match
		return null;
	}

	// 2. Fall back to automatic date-based activation
	for (var i = 0; i < specialEventThemes.length; i++) {
		var t = specialEventThemes[i];
		if (t.dateRange && isDateInRange(
			t.dateRange.monthStart, t.dateRange.dayStart,
			t.dateRange.monthEnd, t.dateRange.dayEnd
		)) {
			return t;
		}
	}

	return null;
}

/* ============================================================================
   Valentine's Day Theme
   ============================================================================ */

registerSpecialEventTheme({
	name: 'valentines',

	dateRange: { monthStart: 2, dayStart: 14, monthEnd: 2, dayEnd: 14 },

	css: function () {
		return [
			'/* --- Valentine\'s Day Theme --- */',
			'.heart-profile-wrap {',
			'    position: relative;',
			'    display: inline-block;',
			'    width: 100%;',
			'}',
			'.heart-profile-wrap img {',
			'    display: block;',
			'    width: 100%;',
			'}',
			'.heart-profile-overlay {',
			'    position: absolute;',
			'    top: 0;',
			'    left: 0;',
			'    width: 100%;',
			'    height: 100%;',
			'}',
			'.valentines-banner {',
			'    font-size: 1.5em;',
			'    letter-spacing: 0.3em;',
			'    margin: 2mm 0;',
			'}',
			'.valentines-header {',
			'    font-family: "Oswald", sans-serif;',
			'    font-size: 1.4em;',
			'    text-transform: uppercase;',
			'    margin: 2mm 0;',
			'}',
			'.valentines-quote {',
			'    font-style: italic;',
			'    margin: 5mm 0;',
			'    padding: 3mm;',
			'    border-top: 1px dashed #999;',
			'    border-bottom: 1px dashed #999;',
			'}'
		].join('\n');
	},

	decorateHtml: function (html) {
		var heartRow = '\u2665 \u2665 \u2665 \u2665 \u2665';

		var topBanner = '<div class="valentines-banner">' + heartRow + '</div>';
		var header = '<div class="valentines-header">Happy Valentine\'s Day</div>';
		var bottomBanner = '<div class="valentines-banner">' + heartRow + '</div>';

		var quote = '<div class="valentines-quote">Valentine\'s Day quote:<br>{{ valentinesQuote }}</div>';

		return topBanner + header + html + quote + bottomBanner;
	},

	addData: function (data, vars) {
		vars['specialEvent'] = 'valentines';
		vars['valentinesQuote'] = window.valentinesQuotes[Math.floor(Math.random() * window.valentinesQuotes.length)];

		var originalImageSrc = imageSrc;
		imageSrc = function (src) {
			if (!src) return originalImageSrc(src);
			var img = originalImageSrc(src);
			var svg = '<svg class="heart-profile-overlay" viewBox="0 0 100 100"'
				+ ' preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'
				+ '<path fill-rule="evenodd" fill="#efefef" d="'
				+ 'M0,0 H100 V100 H0 Z '
				+ 'M50,88 C50,88 8,60 8,30 C8,12 20,2 32,2 C40,2 46,7 50,16 '
				+ 'C54,7 60,2 68,2 C80,2 92,12 92,30 C92,60 50,88 50,88 Z'
				+ '"/></svg>';
			return '<div class="heart-profile-wrap">' + img + svg + '</div>';
		};
		imageSrc.safe = true;
	}
});

/* ============================================================================
   Special Events Addon (hooks into the addon system)
   NOTE: No .template property — the original template passes through unchanged.
   ============================================================================ */

function specialEventsAddon() {

	this.useThisAddon = function (streamerBotArgs) {
		return !!getActiveSpecialEvent(streamerBotArgs);
	};

	this.addTemplateData = function (streamerBotArgs, templateVars) {
		var theme = getActiveSpecialEvent(streamerBotArgs);
		if (theme && theme.addData) {
			theme.addData(streamerBotArgs, templateVars);
		}
	};

	this.modifyTemplateHtml = function (streamerBotArgs, templateHtml) {
		var theme = getActiveSpecialEvent(streamerBotArgs);
		if (!theme) {
			return templateHtml;
		}

		// Inject <style> block
		var styled = templateHtml;
		if (theme.css) {
			styled = '<style>' + theme.css() + '</style>' + styled;
		}

		// Decorate HTML (banners, headers, SVG clip paths)
		if (theme.decorateHtml) {
			styled = theme.decorateHtml(styled);
		}

		return styled;
	};
}

registerAddon(new specialEventsAddon());
