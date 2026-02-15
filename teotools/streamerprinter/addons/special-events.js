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
			'.profileImage img {',
			'    clip-path: url(#heart-clip);',
			'    -webkit-clip-path: url(#heart-clip);',
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
			'}'
		].join('\n');
	},

	decorateHtml: function (html) {
		var heartRow = '\u2665 \u2665 \u2665 \u2665 \u2665';

		// Hidden SVG with heart clipPath for profile images
		var svgClipPath = [
			'<svg width="0" height="0" style="position:absolute">',
			'  <defs>',
			'    <clipPath id="heart-clip" clipPathUnits="objectBoundingBox">',
			'      <path d="M0.5,0.92 C0.28,0.75,0,0.55,0,0.32 C0,0.12,0.15,0,0.3,0 C0.38,0,0.45,0.04,0.5,0.12 C0.55,0.04,0.62,0,0.7,0 C0.85,0,1,0.12,1,0.32 C1,0.55,0.72,0.75,0.5,0.92 Z"/>',
			'    </clipPath>',
			'  </defs>',
			'</svg>'
		].join('\n');

		var topBanner = '<div class="valentines-banner">' + heartRow + '</div>';
		var header = '<div class="valentines-header">Happy Valentine\'s Day</div>';
		var bottomBanner = '<div class="valentines-banner">' + heartRow + '</div>';

		return svgClipPath + topBanner + header + html + bottomBanner;
	},

	addData: function (data, vars) {
		vars['specialEvent'] = 'valentines';
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
