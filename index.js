const request = require('request');
const q = require('q');

const groundIssues = require('./data/unresolved.json');
const config = require('./config/config.json');
const names = require('./config/names.json');

const uploadUrl = config.cloud.url + 'issue/';
const username = config.cloud.username;
const password = config.cloud.password;

if (groundIssues.total > groundIssues.maxResults) {
    // todo call again, with max issues = -1
}
let issues = groundIssues.issues;

let newIssues = [], newSubTasks = [];

let mapIssueType = function (issueType) {

    let cloud = {
        epic: 10000,
        story: 10001,
        task: 10002,
        subtask: 10003,
        bug: 10004
    };

    if (['Improvement', 'Objective'].includes(issueType.name)) {
        return cloud.story;
    } else if (issueType.name === 'Technical Task') {
        return cloud.task;
    } else if (issueType.name === 'Bug') {
        return cloud.bug;
    } else if (issueType.name === 'Epic') {
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
        priority = fields.customfield_14250.value;
    }

    return priorities[priorityMap[priority]];
};

let mapName = function (name) {
    return names[name];
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
                id: '' + mapPriority(issue.fields)
            },
            reporter: {
                name: mapName(issue.fields.reporter.name)
            },
            description: issue.fields.description || 'This issue contained no description'
        }
    };
    
    if (issue.fields.assignee) {
        newIssue.fields.assignee = {
            name: mapName(issue.fields.assignee.name)
        }
    }
    
    if (issue.fields.issuetype.subtask) {
        newSubTasks.push(issue);
    } else {
        newIssues.push({groundKey: issue.key, issue: newIssue});
    }

});

console.log(`Creating ${newIssues.length} issues`);

let requests = [], successes = [], failures = [];
newIssues.forEach(function (issue) {
    let requestPromise = q.defer();
    requests.push(requestPromise.promise);
    request.post({url: uploadUrl, body: issue.issue, json: true})
            .auth(username, password)
            .on('data', function (response) {
                response = JSON.parse(response);
                if (response.errorMessages) {
                    console.log(`Could not create issue from ${issue.groundKey}`);
                    console.log(response);
                    failures.push(issue);
                    requestPromise.reject();
                } else {
                    console.log(`${response.key} successfully created from ${issue.groundKey}`);
                    successes.push({key: issue.groundKey, issue: response});
                    requestPromise.resolve();
                }
            })
            .on('error', function (response) {
                response = JSON.parse(response);
                console.log(`Could not create issue from ${issue.groundKey}.`);
                response.errorMessages.forEach(function (message) {
                    console.log(message);
                });
                failures.push(issue);
                requestPromise.reject();
            });
});

q.all(function () {
    // for each subtask, grab the parent issue from the successes list
    // and find the new key, then create the subtask
});
