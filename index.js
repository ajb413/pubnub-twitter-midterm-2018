var PubNub = require('pubnub')
 
Configure Google Maps API key
var googleMapsClient = require('@google/maps').createClient({
  key: '_your_api_key_here_'
});

// Configure Twitter subscribe key
var pubnubTwitter = new PubNub({
	subscribeKey: "sub-c-78806dd4-42a6-11e4-aed8-02ee2ddab7fe",
})

// Configure personal subscribe and publish key
var pubnubPersonal = new PubNub({
	publishKey: "_your_publish_key_here_",
	subscribeKey: "_your_subscribe_key_here_",
})

// Initiate session_id for the Watson block
var session_Id = 0;

var location = [];

// Listener on the Twitter channel
pubnubTwitter.addListener({

	message: function(m) {
		var msg = m.message;

		var text = msg.text.toLowerCase()

		// midterm 2018 filter
		if (text.match(/(trump|midterms|midterm|#midterm2018|election|senate|republican|democrat|GOP|#votethemout|#bluewave|#redwave|liberal|conservative|#midterms2018|#votefromabroad|#vote|#timetovote|#2020election|#resist|ted cruz|beto)/g) && msg.lang === 'en') {
			session_Id++;

			if (msg.place.full_name) {
				// Get lat/long of tweet location
				googleMapsClient.geocode({
					address: msg.place.full_name
				}, function(err, response) {
					if (!err) {
						var data = response.json.results[0].geometry.location;
						location = [data.lat, data.lng];
					} else {
						console.log('ERROR: ', err);
						location = [];
					}

					// Where we publish tweets for sentiment analysis
					var publishConfig = {
						channel : "sentiment-analysis",
						message : {"session_id":session_Id,"text":msg.text,"coord":location}
					}
					pubnubPersonal.publish(publishConfig, function(status, response) {
						if (status.error) {
							console.log(status, response);
						}
					})
				});
			} else {
				// Where we publish tweets for sentiment analysis
				var publishConfig = {
					channel : "sentiment-analysis",
					message : {"session_id":session_Id,"text":msg.text,"coord":location}
				}
				pubnubPersonal.publish(publishConfig, function(status, response) {
					if (status.error) {
						console.log(status, response);
					}
				})
			}
		}
	}

})

// Listener on our PubNub app channel
pubnubPersonal.addListener({
	
	message: function(m) {
		// Your Initial State bucket key
		// Make sure to create a bucket in IS with the same key
		var bucketKey = "PubNubMidTerm2018"
		var msg = m.message;

		// Here we construct and publish a payload made up of parameters from sentiment analysis
		if ("session_sentiment" in msg) {
			var payloadMsg = {"key": "Tweet","value": msg.text}
			console.log(msg.text);

			if ("positive" in msg.session_sentiment) {
				payloadPos = {"key": "Positive Level","value":msg.session_sentiment.positive.count}
			} else {
				payloadPos = {"key": "Positive Level","value":0}
			};
			if ("negative" in msg.session_sentiment) {
				payloadNeg = {"key": "Negative Level","value":msg.session_sentiment.negative.count}
			} else {
				payloadNeg = {"key": "Negative Level","value":0}
			};
			if ("neutral" in msg.session_sentiment) {
				payloadNeut = {"key": "Neutral Level","value":msg.session_sentiment.neutral.count}
			} else {
				payloadNeut = {"key": "Neutral Level","value":0}
			};

			payloadScore = {"key": "Score","value": msg.score}

			if (msg.score > 0.25) {
				payloadCoord = {"key": "User Location Pos","value":msg.coord}
			} else if (msg.score < -0.25) {
				payloadCoord = {"key": "User Location Neg","value":msg.coord}
			} else if (typeof msg.coord == "undefined" || msg.coord == null || msg.coord.length == 0) {
				payloadCoord = {"key": "User Location","value":"No location data"}
			} else {
				payloadCoord = {"key": "User Location Neut","value":msg.coord}
			}

			var publishConfig = {
				channel : "initial-state-streamer",
				message : {
					"events": [
						payloadMsg,
						payloadPos,
						payloadNeg,
						payloadNeut,
						payloadScore,
						payloadCoord
					],
				"bucketKey":bucketKey}
			}
			pubnubPersonal.publish(publishConfig, function(status, response) {
				if (status.error) {
					console.log(status, response);
				}
			})
		} else {
			console.log("No sentiment message from AWS Comprehend");
		}
	}
	
})


// Configure PubNub subscriptions

pubnubTwitter.subscribe({
	channels: ['pubnub-twitter'],
})

pubnubPersonal.subscribe({
	channels: ['sentiment-analysis'],
})
