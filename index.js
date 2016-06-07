const request = require('request');

const groundIssues = require('./data/unresolved.json');
const config = require('./config/config.json');
const names = require('./config/names.json');

const uploadUrl = config.cloud.url + 'issue/bulk';
const username = config.cloud.username;
const password = config.cloud.password;

if (groundIssues.total > groundIssues.maxResults) {
    // todo call again, with max issues = -1
}
let issues = groundIssues.issues;

let newIssues = [];

let mapIssueType = function (issueType) {

    let cloud = {
        epic: 10000,
        story: 10001,
        task: 10002,
        subtask: 10003,
        bug: 10004
    };

    if (issueType.subtask) {
        return cloud.subtask;
    } else if (['Improvement', 'Objective', 'Technical task'].includes(issueType.name)) {
        return cloud.story;
    } else if (issueType.name === 'Bug') {
        return cloud.bug;
    } else if (issueType.name === 'Epid') {
        return cloud.bug;
    }
    
    return null;
};

let mapPriority = function (fields) {

    let priorities = {
        highest: 1,
        high: 2,
        medium: 3,
        low: 4,
        lowest: 5,
        blocked: 10000
    };

    let priorityMap = require('./config/priorities.json');

    let priority = fields.priority.name;

    // NFRIP uses custom MoSoCoW priorities
    if (fields.customfield_14250) {
        priority = fields.customfield_14250;
    }

    return priorities[priorityMap[priority]];
};

let mapName = function (name) {
    return names[name];
};

let mapStatus = function (status) {

    let statuses = {
        inProgress: 3,
        completed: 10001,
        socialised: 5,
        todo: 10000,
        done: 10200,
        open: 10300,
        review: 10301,
        cancelled: 10303,
        escalation: 10400,
        testing: 10500
    };
    
    let statusMap = require('./config/statuses.json');
    let status = status.name;
    
    return statuses[statusMap[status]];
};

issues.forEach(function (issue) {

    let newIssue = {
        fields: {
            project: {
                key: issue.fields.project.key
            },
            summary: issue.fields.summary,
            issuetype: {
                id: mapIssueType(issue.fields.issuetype)
            },
            priority: {
                id: mapPriority(issue.fields)
            },
            assignee: {
                name: mapName(issue.fields.assignee.name)
            },
            reporter: {
                name: mapName(issue.fields.reporter.name)
            },
            status: {
                id: mapStatus(issue.fields.status)
            },
            created: issue.fields.created,
            description: issue.fields.description
        }
    };

    newIssues.push(newIssue);

});

let data = {
    issueUpdates: newIssues
};

let outputResponse = function (response) {
    response = JSON.parse(response);

    if (response.issues.length) {
        console.log('New issues created:');
        response.issues.forEach(function (issue) {
            console.log(issue.key)
        });
    }

    if (response.errors.length) {
        console.log('The following issues could not be created:');
        response.errors.forEach(function (error) {
            error = JSON.parse(error);
            console.log(issues[error.failedElementNumber]);

            let errors = error.elementErrors;
            errors.errorMessages.forEach(function (message) {
                console.log(message);
            });
            for (let e in errors) {
                if (errors.hasOwnProperty(e)) {
                    console.log(e + ': ' + error.elementErrors[e]);
                }
            }
        });
    }
};

request.post({url: uploadUrl, body: data, json: true})
        .auth(username, password)
        .on('data', function (response) {
            outputResponse(response);
        })
        .on('error', function (response) {
            outputResponse(response);
        });
