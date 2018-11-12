const AWS = require('aws-sdk');
// update configuration to meet your requirements
const sqs = new AWS.SQS({ region: process.env.QUEUE_REGION, httpOptions: {connectTimeout: process.env.CONNECT_TIMEOUT, timeout: process.env.TIMEOUT} });

const mysql = require('mysql');
const pool = mysql.createPool({
    connectionLimit: process.env.MYSQL_POOL_SIZE,
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
});

const campaignDataService = require('./campaign');
const campaignService = new campaignDataService(pool);

const clickEventService = require('./clickEvent');

const sqsDataService = require('./sqs');
const sqsService = new sqsDataService(sqs);

exports.handler = (event, context) => {
    context.hash = event.pathParameters.campaignHash;

    let sqsCallback = function(event, context, clickEvent){
        // also handles sending a message to sns which will then trigger our worker to finally write the event
        sqsService.sendClickEventToSqs(event, context, clickEvent);
    };

    let createClickEventCallback = function(event, context, campaignData) {
        clickEventService.createClickEvent(event, context, campaignData, sqsCallback);
    };

    campaignService.getCampaignData(event, context, createClickEventCallback);
};
