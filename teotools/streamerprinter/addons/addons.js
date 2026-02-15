function waifuAddon() {

	this.addonName = "waifu";

	/* returns true if you use this template */
	this.useThisAddon = function (streamerBotArgs) {
		console.log("WAIFU " + this.addonName);
		return ("addon" in streamerBotArgs) && (streamerBotArgs['addon'] == this.addonName);
	};
	
	this.template = function(streamerBotArgs) {
		return "waifu_template";
	},
	
	this.addTemplateData = function (streamerBotArgs, templateVars) {
		var waifuNumber = 10000+Math.floor(Math.random() * 80000);
		templateVars['waifuImage'] = "https://www.thiswaifudoesnotexist.net/example-" + waifuNumber + ".jpg";
	};

	this.modifyTemplateHtml = function (streamerbotArgs, templateHtml) {

		return templateHtml;
	}
	
}
registerAddon(new waifuAddon());

/* -------------------------------------------------------------------------------- */

function lottoAddon() {
	/* returns true if you use this template */
	this.useThisAddon = function(streamerBotArgs) {
		return ("addon" in streamerBotArgs) && (streamerBotArgs['addon'] == "lotto");
	}

	
	this.template = function(streamerBotArgs) {
		return "lotto_template";
	}

	function randomNumbers(max, n) {
		random_numbers = "";
		for (i=1;i<=n;i++) {
			random_numbers += " • " + Math.ceil(Math.random()*max)
		}
		return random_numbers;
	}

	this.addTemplateData = function (streamerBotArgs, templateVars) {
		templateVars['lottoNumbers'] = randomNumbers(69, 5);
	}

	this.modifyTemplateHtml = function (streamerbotArgs, templateHtml) {
		templateHtml = templateHtml + "";
		return templateHtml;
	}
};

registerAddon(new lottoAddon());

/* -------------------------------------------------------------------------------- */

function fortunesAddon(){
	/* returns true if you use this template */
	this.useThisAddon = function(streamerBotArgs) {
		return ("addon" in streamerBotArgs) && (streamerBotArgs['addon'] == "fortune");
	}
	
	this.template = function(streamerBotArgs) {
		return "fortune_template";
	}

	this.addTemplateData = function (streamerBotArgs, templateVars) {
		templateVars['fortune'] = window.fortunes[Math.floor(Math.random()*window.fortunes.length)]
	}

	this.modifyTemplateHtml = function (streamerbotArgs, templateHtml) {
		templateHtml = templateHtml + "";
		return templateHtml;
	}
}

registerAddon(new fortunesAddon());

/*------------------------------------------------------------------------------- */


function printTextAddon(){
	this.addonName = "print_text";

	/* returns true if you use this template */
	this.useThisAddon = function(streamerBotArgs) {
		return ("addon" in streamerBotArgs) && (streamerBotArgs['addon'] == this.addonName);
	}
	
	this.template = function(streamerBotArgs) {
		return "print_text_template";
	}

	this.addTemplateData = function (streamerBotArgs, templateVars) {
		templateVars['text'] = streamerBotArgs['text'];
	}

	this.modifyTemplateHtml = function (streamerbotArgs, templateHtml) {
		templateHtml = templateHtml + "";
		return templateHtml;
	}
}

registerAddon(new printTextAddon());


/*------------------------------------------------------------------------------- */


function printHtmlAddon(){
	this.addonName = "print_html";

	/* returns true if you use this template */
	this.useThisAddon = function(streamerBotArgs) {
		return ("addon" in streamerBotArgs) && (streamerBotArgs['addon'] == this.addonName);
	}
	
	this.template = function(streamerBotArgs) {
		return "print_html_template";
	}

	this.addTemplateData = function (streamerBotArgs, templateVars) {
		templateVars['html'] = streamerBotArgs['html'];
	}

	this.modifyTemplateHtml = function (streamerbotArgs, templateHtml) {
		templateHtml = templateHtml + "";
		return templateHtml;
	}
}

registerAddon(new printHtmlAddon());
