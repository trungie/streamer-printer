function parseINIString(data){
	var regex = {
		section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
		param: /^\s*([^=]+?)\s*=\s*\"(.*?)\"\s*$/,
		comment: /^\s*;.*$/
	};
	var value = {};
	var lines = data.split(/[\r\n]+/);
	var section = null;
	lines.forEach(function(line){
		if(regex.comment.test(line)){
			return;
		} else if(regex.param.test(line)){
			var match = line.match(regex.param);
			if (section){
				value[section][match[1]] = match[2];
			} else{
				value[match[1]] = match[2];
			}
		}else if(regex.section.test(line)){
			var match = line.match(regex.section);
			value[match[1]] = {};
			section = match[1];
		}else if(line.length == 0 && section){
			section = null;k
		};
	});
	return value;
}

function setPaperSize(paperSize) {
	var receipt = document.getElementById("receipt");
	receipt.classList.add(paperSize);
}

var addons = [];

function registerAddon(addon) {
	addons.push(addon);
}

function twitchEventsAddon() {
	this.addonName = "twitch";

	/* returns true if you use this template */
	this.useThisAddon = function (streamerBotArgs) {
		
		return !!this.template();
	};
	
	this.template = function(streamerBotArgs) {
		switch (data['source']) {
			// Sub
			case "TwitchSub":
				window.template = "nongift_sub_template";
				break;
			// Resub
			case "TwitchReSub":
				window.template = "nongift_sub_template";
				break;
			// Gift Sub
			case "TwitchGiftSub":
				window.template = "gift_sub_template";
				break;
			// Gift Bomb	
			case "TwitchGiftBomb":
				window.template = "gift_bomb_template";
				break;
			// Host
			case "TwitchFollow":
				window.template = "follow_template";
				break;
			// Host
			case "TwitchHost":
				window.template = "host_template";
				break;
			// Host
			case "TwitchRaid":
				window.template = "raid_template";
				break;			
			case "TwitchCheer":
				window.template = "bits_template";
				break;
			case "StreamElementsTip":
				window.template = "streamelements_tip";
				break;
			case "StreamlabsTip":
				window.template = "streamlabs_tip";
				break;			
			case "RewardRedemption":
				window.template = "generic_reward_redemption";
				break;
			// // Hype Train Start
			// case 108:
				// window.template = "hype_train_start";
				// break;
			// // Hype Train Level Up
			// case 110:
				// window.template = "hype_train_level_up";
				// break;			
			// // Hype Train Progress
			// case 109:
				// window.template = "hype_train_progress";
				// break;			
			// // Hype Train Finish
			// case 111:
				// window.template = "hype_train_finish";
				// break;		
		}
		if (data['anonymous']) {
			if (data['source'] == "TwitchGiftSub") {	
				window.template = "anon_gift_sub_template";
			}
			if (data['source'] == "TwitchCheer") {	
				window.template = "anon_bits_template";
			}
		}
		return window.template;
	};
	
	this.addTemplateData = function (streamerBotArgs, templateVars) {

		templateVars['userProfileImage'] = "";
		
		if ("targetUserProfileImageUrl" in streamerBotArgs) {
			templateVars['userProfileImage'] = streamerBotArgs['targetUserProfileImageUrl'];
		}
		
		if ((streamerBotArgs['source'] == "TwitchSub") || (templateVars['source'] == "TwitchReSub"))  {
			if (streamerBotArgs['cumulative']) {
				templateVars['month_total'] = streamerBotArgs['cumulative'];
			}
			templateVars['sub_display_name'] = streamerBotArgs['user'];
			templateVars['tier'] = streamerBotArgs['tier'];
			templateVars['message'] = streamerBotArgs['rawInput'];
		}
		
		if (streamerBotArgs['source'] == "TwitchGiftSub") {
			templateVars['month_total'] = streamerBotArgs['monthsGifted'];
			templateVars['total_subs_gifted'] = streamerBotArgs['totalSubsGifted'];
			templateVars['sub_display_name'] = streamerBotArgs['user'];
			templateVars['recipient_display_name'] = streamerBotArgs['recipientUser'];
			templateVars['tier'] = streamerBotArgs['tier'];
			templateVars['message'] = streamerBotArgs['rawInput'];
		}
		
		if (streamerBotArgs['source'] == "TwitchGiftBomb") {	
			templateVars['sub_display_name'] = streamerBotArgs['user'];
			templateVars['number_gifted'] = streamerBotArgs['gifts'];
			templateVars['total_subs_gifted'] = streamerBotArgs['totalGifts'];
			templateVars['tier'] = streamerBotArgs['tier'];
		}
		
		if (streamerBotArgs['source'] == "TwitchRaid") {	
			templateVars['user'] = streamerBotArgs['user'];
			templateVars['viewers'] = streamerBotArgs['viewers'];
		}	
		
		if (streamerBotArgs['source'] == "TwitchHost") {	
			templateVars['user'] = streamerBotArgs['user'];
			templateVars['viewers'] = streamerBotArgs['viewers'];
		}		
		
		if (streamerBotArgs['source'] == "TwitchCheer")  {
			templateVars['name'] = streamerBotArgs['user'];
			templateVars['amount'] = streamerBotArgs['bits'];
			templateVars['message'] = streamerBotArgs['messageStripped'];
		}	
		
		var SECurrencies = {
			'GBP':'£',
			'USD':'$',
			'EUR':'€',
			'AUD':'$',
			'CAD':'$',
		};
		
		if (streamerBotArgs['source'] == "StreamElementsTip")  {
			templateVars['name'] = streamerBotArgs['tipUsername'];
			templateVars['amount'] = streamerBotArgs['tipAmount'];
			templateVars['message'] = streamerBotArgs['tipMessage'];
			templateVars['currency'] = streamerBotArgs['tipCurrency'];
			templateVars['picture'] = streamerBotArgs['tipAvatar'];
			templateVars['currencySymbol'] = SECurrencies[streamerBotArgs['tipCurrency']];
		}		
		
		if (streamerBotArgs['source'] == "StreamlabsTip")  {
			templateVars['name'] = streamerBotArgs['donationFrom'];
			templateVars['amount'] = streamerBotArgs['donationAmount'];
			templateVars['message'] = streamerBotArgs['donationMessage'];
			templateVars['currency'] = streamerBotArgs['donationCurrency'];
			templateVars['currencySymbol'] = SECurrencies[streamerBotArgs['donationCurrency']];
		}		
		
		if (streamerBotArgs['source'] == "RewardRedemption") {
			templateVars['name'] = streamerBotArgs['user'];
			templateVars['redeem_name'] = streamerBotArgs['rewardName'];
			templateVars['message'] = streamerBotArgs['rawInput'];
		}
	};

	this.modifyTemplateHtml = function (streamerbotArgs, templateHtml) {
		return templateHtml;
	}
}


registerAddon(new twitchEventsAddon());

function processDataThroughAddons(sbData, templateVars) {
	for (var i=0;i<addons.length;i+=1) {
		addon = addons[i];
		if (addon.useThisAddon(sbData)) {
			console.log(addon);
			if (addon.addTemplateData && typeof addon.addTemplateData == "function") {
				extraData = addon.addTemplateData(sbData, templateVars);
			}
		}
	}
}

function processTemplateHtmlThroughAddons(sbData, templateHtml) {
	for (var i=0;i<addons.length;i+=1) {
		addon = addons[i];
		if (addon.useThisAddon(sbData)) {
			if (addon.modifyTemplateHtml && typeof addon.modifyTemplateHtml == "function") {
				templateHtml = addon.modifyTemplateHtml(sbData, templateHtml);
			}
		}
	}
	return templateHtml;
}


function getTemplateNameThroughAddons(sbData) {
	var template = null;

	for (var i=0;i<addons.length;i+=1) {
		addon = addons[i];

		if (addon.useThisAddon(sbData)) {
			if (addon.template && typeof addon.template == "function") {
				template = addon.template(sbData);
			}
			if (addon.template && typeof addon.template == "string") {
				template = addon.template;
			}
		}
	}

	return template;
}


function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function imageSrc(string) {
	return '<img src="' + string + '" />';
}

function renderTemplate() {

	if (window.sourceProgram == "lioranboard") {
		var text = document.getElementById("ini").innerText;
		window.data = parseINIString(text);
	}
	templateVars = window.data;
	
	processDataThroughAddons(window.data, templateVars);
	
	templateVars['datetime'] = (new Date()).toLocaleString();	
	templateVars['date'] = (new Date()).toLocaleDateString();	
	templateVars['pageBreak'] = "<div class='pageBreak'></div>";

	addonTemplate = getTemplateNameThroughAddons(window.data);
	console.log(addonTemplate);

	if (addonTemplate) {
		var templateHtml = document.getElementById(addonTemplate).innerHTML;
	} else {
		var templateHtml = document.getElementById(window.template).innerHTML;
	}

	templateHtml = processTemplateHtmlThroughAddons(window.data, templateHtml);
	imageSrc.safe = true;
	swig.setFilter('image', imageSrc);

	output =  ( swig.render(
		templateHtml, 
		{ locals: templateVars}) 
	);

	document.getElementById("receipt").innerHTML =  output;
}