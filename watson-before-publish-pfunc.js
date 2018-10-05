// require xhr
const XHR = require('xhr');
const basicAuth = require('codec/auth');
const vault = require('vault');

// require state
const db = require('kvstore');

export default (request) => {
    // url for sentiment analysis api
    const apiUrl = 'https://gateway.watsonplatform.net/natural-language-understanding/api/v1/analyze?version=2018-03-19';

    // IBM basic auth data, stored in PubNub Functions Vault
    let username;
    let password;

    return vault.get('IBM_USERNAME').then((IBM_USERNAME) => {
        username = IBM_USERNAME;
        return vault.get('IBM_PASSWORD');
    }).then((IBM_PASSWORD) => {
        password = IBM_PASSWORD;

        const sessionId = request.message.session_id;

        let http_options = {
            "method": "POST",
            "headers": {
                "Content-Type": "application/json",
                "Authorization": basicAuth.basic(username, password),
            },
            "body": {
                "text": request.message.text,
                "language": "en",
                "features": {
                    "sentiment": {},
                    "keywords": {}
                }
            }
        };

        return db.get('sentiment_db').then(function (val) {
            const sentimentDb = val || {};
            const sessionSentiment = sentimentDb[sessionId] || {
                overall: 0,
                positive: {
                    count: 0,
                    avg: 0
                },
                negative: {
                    count: 0,
                    avg: 0
                }
            };

            return XHR.fetch(apiUrl, http_options).then(function (r) {
                console.log(r);
                const body = JSON.parse(r.body);
                const type = body.sentiment.document.label;
                const score = body.sentiment.document.score;
                const cur = sessionSentiment[type] || { count: 0, avg: 0 };
                const curSum = cur.avg * cur.count;
                const newtotal = ++(cur.count);
                const newAvg = ((curSum) + Number(score)) / newtotal;

                sessionSentiment[type] = {
                    count: newtotal,
                    avg: newAvg
                };

                sessionSentiment.overall =
                    (sessionSentiment.positive.count
                        * sessionSentiment.positive.avg) +
                    (sessionSentiment.negative.count
                        * sessionSentiment.negative.avg);

                sentimentDb[sessionId] = sessionSentiment;

                db.set('sentiment_db', sentimentDb);

                request.message.session_id = sessionId;
                request.message.session_sentiment = sessionSentiment;
                request.message.score =
                    sessionSentiment.overall + (Math.random() / 10000);

                return request.ok();
            })
            .catch(function (e){
                console.error(e);
                return request.ok();
            });
        });
    });
};
