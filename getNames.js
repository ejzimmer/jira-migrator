let request = require('request');
let config = require('./config/config.json');

let projectKey = process.argv[2];
let downloadUrl = config.server.url + 'user/assignable/search?project=' + projectKey;

request.get(downloadUrl)
        .auth(username, password)
        .on('data', function (response) {
            let users = JSON.parse(response);
            users.forEach(function (user) {
                console.log(user.name + ': ' + user.displayName);
            });
        })
        .on('error', function (error) {
            console.log(error)
        });

