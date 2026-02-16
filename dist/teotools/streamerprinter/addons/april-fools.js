/* ============================================================================
   April Fools Addon — Fake Itemized Bill
   Appends a joke receipt with random items that sum to the exact tip amount.
   Activates on April 1st or via "addon": "aprilfools" in the JSON data.
   ============================================================================ */

var APRIL_FOOLS_DOLLARS_PER_LINE = 3;
var APRIL_FOOLS_MIN_LINES = 2;
var APRIL_FOOLS_MAX_LINES = 15;
var APRIL_FOOLS_MIN_PRICE_CENTS = 1;

/* --- Price distribution algorithm ---------------------------------------- */

function distributeCents(totalCents, n, minCents) {
	// Give each item the minimum first
	var prices = [];
	for (var i = 0; i < n; i++) {
		prices.push(minCents);
	}
	var remainder = totalCents - (n * minCents);

	// Generate n-1 random breakpoints in [0, remainder], sort, diff
	var breakpoints = [];
	for (var i = 0; i < n - 1; i++) {
		breakpoints.push(Math.floor(Math.random() * (remainder + 1)));
	}
	breakpoints.push(0);
	breakpoints.push(remainder);
	breakpoints.sort(function (a, b) { return a - b; });

	for (var i = 0; i < n; i++) {
		prices[i] += breakpoints[i + 1] - breakpoints[i];
	}

	// Shuffle (Fisher-Yates)
	for (var i = prices.length - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var tmp = prices[i];
		prices[i] = prices[j];
		prices[j] = tmp;
	}

	return prices;
}

/* --- Format cents as dollar string --------------------------------------- */

function formatPrice(cents, currencySymbol) {
	var dollars = Math.floor(cents / 100);
	var c = cents % 100;
	return currencySymbol + dollars + '.' + (c < 10 ? '0' : '') + c;
}

/* --- Build the bill HTML ------------------------------------------------- */

function buildBillHtml(items, prices, totalCents, currencySymbol) {
	var html = '';
	html += '<table class="af-bill" style="width:100%; border-collapse:collapse; font-family:\'Courier New\',monospace; font-size:0.85em; margin-top:5mm;">';

	// Top separator
	html += '<tr><td colspan="2" style="text-align:center; padding:2mm 0;">- - - - - - - - - - - - -</td></tr>';

	// Header
	html += '<tr><td colspan="2" style="text-align:center; font-weight:bold; padding:1mm 0; font-size:1.1em;">YOUR RECEIPT</td></tr>';

	// Separator
	html += '<tr><td colspan="2" style="text-align:center; padding:2mm 0;">- - - - - - - - - - - - -</td></tr>';

	// Item rows
	for (var i = 0; i < items.length; i++) {
		html += '<tr>';
		html += '<td style="text-align:left; padding:1mm 0;">' + items[i] + '</td>';
		html += '<td style="text-align:right; padding:1mm 0; white-space:nowrap;">' + formatPrice(prices[i], currencySymbol) + '</td>';
		html += '</tr>';
	}

	// Total separator
	html += '<tr><td colspan="2" style="border-top:1px solid #333; padding:0;"></td></tr>';

	// Total row
	html += '<tr>';
	html += '<td style="text-align:left; font-weight:bold; padding:2mm 0;">TOTAL</td>';
	html += '<td style="text-align:right; font-weight:bold; padding:2mm 0; white-space:nowrap;">' + formatPrice(totalCents, currencySymbol) + '</td>';
	html += '</tr>';

	// Bottom separator + footer
	html += '<tr><td colspan="2" style="text-align:center; padding:2mm 0;">- - - - - - - - - - - - -</td></tr>';
	html += '<tr><td colspan="2" style="text-align:center; padding:1mm 0; font-style:italic;">Thank you for your purchase!</td></tr>';
	html += '<tr><td colspan="2" style="text-align:center; padding:1mm 0; font-weight:bold;">NO REFUNDS - ALL SALES FINAL</td></tr>';
	html += '<tr><td colspan="2" style="text-align:center; padding:2mm 0;">- - - - - - - - - - - - -</td></tr>';

	html += '</table>';
	return html;
}

/* --- Fetch AI-generated items via Claude API ----------------------------- */

function fetchAIItems(username, amount, message, numItems) {
	try {
		var apiKey = window.data.claudeApiKey;
		var promptTemplate = window.data.aprilFoolsPrompt;

		// Guard: no key or placeholder key
		if (!apiKey || apiKey === 'YOUR_CLAUDE_API_KEY_HERE') return null;
		if (!promptTemplate) return null;

		// Build prompt from template
		var prompt = promptTemplate
			.replace(/\{username\}/g, username)
			.replace(/\{amount\}/g, amount)
			.replace(/\{message\}/g, message)
			.replace(/\{numItems\}/g, String(numItems));

		// Synchronous XHR to Claude API
		var xhr = new XMLHttpRequest();
		xhr.open('POST', 'https://api.anthropic.com/v1/messages', false);
		xhr.setRequestHeader('x-api-key', apiKey);
		xhr.setRequestHeader('anthropic-version', '2023-06-01');
		xhr.setRequestHeader('content-type', 'application/json');
		xhr.setRequestHeader('anthropic-dangerous-direct-browser-access', 'true');
		xhr.send(JSON.stringify({
			model: 'claude-haiku-4-5-20251001',
			max_tokens: 300,
			messages: [{ role: 'user', content: prompt }]
		}));

		if (xhr.status !== 200) return null;

		var response = JSON.parse(xhr.responseText);
		var text = response.content[0].text;

		// Strip markdown code fences if present
		text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');

		var items = JSON.parse(text);
		if (!Array.isArray(items)) return null;

		// Sanitize: strip HTML tags, truncate to 50 chars
		for (var i = 0; i < items.length; i++) {
			items[i] = String(items[i]).replace(/<[^>]*>/g, '');
			if (items[i].length > 50) items[i] = items[i].substring(0, 50);
		}

		// Pad if too few (cycle from start), truncate if too many
		if (items.length === 0) return null;
		var originalLen = items.length;
		while (items.length < numItems) {
			items.push(items[items.length % originalLen]);
		}
		items = items.slice(0, numItems);

		return items;
	} catch (e) {
		return null;
	}
}

/* --- Pick random items without repeats ----------------------------------- */

function pickRandomItems(n) {
	var pool = window.aprilFoolsItems.slice();
	var picked = [];
	for (var i = 0; i < n && pool.length > 0; i++) {
		var idx = Math.floor(Math.random() * pool.length);
		picked.push(pool[idx]);
		pool.splice(idx, 1);
	}
	return picked;
}

/* --- The Addon ----------------------------------------------------------- */

function aprilFoolsAddon() {

	this.useThisAddon = function (streamerBotArgs) {
		var source = streamerBotArgs['source'];
		var isTip = (source === 'StreamElementsTip' || source === 'StreamlabsTip');
		if (!isTip) return false;

		// Manual activation via addon field
		if (streamerBotArgs['addon'] === 'aprilfools') return true;

		// Auto-activate on April 1st
		var now = new Date();
		return (now.getMonth() === 3 && now.getDate() === 1); // getMonth() is 0-indexed
	};

	this.addTemplateData = function (streamerBotArgs, templateVars) {
		var amount = parseFloat(templateVars['amount']);
		if (isNaN(amount) || amount <= 0) return;

		var totalCents = Math.round(amount * 100);
		var currencySymbol = templateVars['currencySymbol'] || '$';

		// Calculate line count: dollars / ratio, clamped to min/max
		var lineCount = Math.round(amount / APRIL_FOOLS_DOLLARS_PER_LINE);
		lineCount = Math.max(APRIL_FOOLS_MIN_LINES, Math.min(APRIL_FOOLS_MAX_LINES, lineCount));

		// Ensure we have enough cents for minimum prices
		if (totalCents < lineCount * APRIL_FOOLS_MIN_PRICE_CENTS) {
			lineCount = Math.floor(totalCents / APRIL_FOOLS_MIN_PRICE_CENTS);
		}
		if (lineCount < 1) return;

		var prices = distributeCents(totalCents, lineCount, APRIL_FOOLS_MIN_PRICE_CENTS);

		// Try AI-generated items if enabled
		var items = null;
		if (streamerBotArgs['aprilFoolsAI']) {
			var username = streamerBotArgs['tipUsername'] || 'Anonymous';
			var message = streamerBotArgs['tipMessage'] || '';
			items = fetchAIItems(username, String(amount), message, lineCount);
		}

		// Fall back to random items
		if (!items) {
			items = pickRandomItems(lineCount);
		}

		templateVars['aprilFoolsBill'] = buildBillHtml(items, prices, totalCents, currencySymbol);
	};

	this.modifyTemplateHtml = function (streamerBotArgs, templateHtml) {
		return templateHtml + '\n{{ aprilFoolsBill|raw }}';
	};
}

registerAddon(new aprilFoolsAddon());
