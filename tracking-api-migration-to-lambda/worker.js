const AWS = require('aws-sdk');
// update configuration to meet your requirements

let sqsQueueRegion = process.env.QUEUE_REGION;
let sqsMaxNumberOfMessages = parseInt(process.env.MESSAGE_BATCH_SIZE);
let sqsWaitTimeBetweenRequests = parseInt(process.env.QUEUE_WAIT_TIME_BETWEEN_REQUESTS);
let sqsQueueUrl = process.env.QUEUE_URL;

let sqs = new AWS.SQS();

const dynamodb = new AWS.DynamoDB();
const dynamodbDataService = require('./dynamodb');
const dynamodbService = new dynamodbDataService(dynamodb);

exports.handler = (event, context) => {
    let retry = false;
    let loads = 0;
    let messagesAddBatch = {};
    let messageRemovalBatch = {};

    let receiveFromSqsCb = function (err, data) {
        if (err) {
            if (!retry) {
                retry = true;
                sqs = new AWS.SQS({
                    region: sqsQueueRegion,
                    httpOptions: {connectTimeout: 1000, timeout: 1100}
                });
                receiveFromSqs();
                return;
            }
        }

        let sqsMessages = data.Messages;

        for (let i in sqsMessages) {
            if (!sqsMessages.hasOwnProperty(i)) {
                continue;
            }

            let message = sqsMessages[i].Body;
            message = JSON.parse(message);

            messagesAddBatch[message.id] = message;
            messageRemovalBatch[message.id] = {
                Id: message.id,
                ReceiptHandle: sqsMessages[i].ReceiptHandle
            };
        }

        if (Object.values(messagesAddBatch).length === 0) {
            context.done();

            return;
        }

        if (Object.values(messagesAddBatch).length >= elasticMaxNumberOfMessages || context.getRemainingTimeInMillis() < 5000 || loads > 50 || typeof sqsMessages === 'undefined') {
            let dynamoBulk = [];

            for (let i in messagesAddBatch) {
                if (!messagesAddBatch.hasOwnProperty(i)) {
                    continue;
                }

                let message = messagesAddBatch[i];

                dynamoBulk.push(JSON.parse(JSON.stringify(message)));
            }

            dynamodbService.saveAll(dynamoBulk, removeFromSqs, context, messageRemovalBatch);
        }
        else {
            setTimeout(receiveFromSqs, sqsWaitTimeBetweenRequests);
        }
    };

    let receiveFromSqs = function () {
        loads++;
        sqs.receiveMessage({
            QueueUrl: sqsQueueUrl,
            MaxNumberOfMessages: sqsMaxNumberOfMessages
        }, receiveFromSqsCb);
    };

    let failedDeletions = 0;
    let removeFromSqsCb = function () {
        if (failedDeletions > 0) {
            context.done('there were ' + failedDeletions + ' errors');

            return;
        }
        context.succeed('done');
    };

    let removeFromSqs = function (context, messageRemovalBatch) {
        sqs.deleteMessageBatch({
            QueueUrl: sqsQueueUrl,
            Entries: Object.values(messageRemovalBatch)
        }, function (err) {
            if (err) {
                failedDeletions++;
            }

            removeFromSqsCb();
        });
    };

    receiveFromSqs();
};
