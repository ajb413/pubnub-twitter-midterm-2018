// http://docs.initialstateeventsapi.apiary.io/#reference/event-buckets/buckets-json/send-events?console=1
// Example published message payload
// {
//     "events": [
//         {
//             "key": "temperature",
//             "value": 16
//         }
//     ],
//     "bucketKey": "PBUYDWHTRMT4"
// }
// With epoch
// {
//     "events": [
//         {
//             "key": "temperature",
//             "value": 16,
//             "epoch": 1419876022.778477
//         }
//     ],
//     "bucketKey": "PBUYDWHTRMT4"
// }

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

        return xhr.fetch(url, http_options).then((x) => {
            return request.ok();
        });
    });
}
