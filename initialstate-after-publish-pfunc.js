// Add your INITIAL_STATE_KEY to the PubNub Functions Vault by clicking MY SECRETS

const vault = require('vault');

export default (request) => { 
    const xhr = require('xhr');
    
    return vault.get('INITIAL_STATE_KEY').then((INITIAL_STATE_KEY) => {
        // TODO: setup initialstate access key
        const accessKey = INITIAL_STATE_KEY;

        const events = request.message.events;
        const bucketKey = request.message.bucketKey;

        const http_options = {
            "method": "POST",
            "headers": {
                "Content-Type": "application/json",
                "X-IS-AccessKey": accessKey,
                "X-IS-BucketKey": bucketKey,
                "Accept-Version": "0.0.4"
            },
            body: JSON.stringify(events)
        };
          
        const url = "https://groker.initialstate.com/api/events";

        return xhr.fetch(url, http_options).then((initialStateApiResponse) => {
            console.log(initialStateApiResponse);
            return request.ok();
        });
    }).catch((err) => {
        console.error(err);
    });
};
