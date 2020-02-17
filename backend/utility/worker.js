
const getDb = require('../database/db').getDb;
const user = require('../models/user-model');
const arrayToTree = require('array-to-tree');
const schedule = require('node-schedule');
const oracledb = require('oracledb');
const axios = require('axios');
var uniqid = require('uniqid');
let assetlinkCount = 0;
let winlinkcount = 0;

exports.userUpdateCount = 0;
let exclusionFilterList = ['14983ddhswcdol', 'Gdjfdskyuetr472V', '170k5dr4xvz', 'fd5k53p09dl', 'fd5k53p15c7'];


webworker = () => {
    // console.log("Link validator working. . . ");

    let timeToTick = {
        second: 10
        // hour: 12
        // minute: 10,
        // dayOfWeek: 1
    }
    schedule.scheduleJob(timeToTick, () => {
        assetlinkCount = 0;
        winlinkcount = 0;

        // LDAP SYNC WORKER
        console.log("Starting LDAP worker");
        user.getLdapInfoComplete().then(data => {
            if (data != undefined) {
                console.log("Ldap synced . . . ");
                this.updateUserLob(undefined, undefined);
            }
        });


        // LINK VERIFY WORKER
        console.log("Starting link verifier");
        // linkvalidator(getAllWinstoryLinks(), "WINSTORY");
        // linkvalidator(getAllAssetLinks(), "ASSET");
        // EXPIERY VERIFY WORKER
    });

}

webworkertrigger = () => {
    // console.log("Link validator working. . . ");
    assetlinkCount = 0;
    winlinkcount = 0;

    // LDAP SYNC WORKER
    console.log("Starting Once LDAP worker");
    user.getLdapInfoComplete().then(data => {
        if (data != undefined) {
            console.log("Ldap synced . . . ");
            this.updateUserLob(undefined, undefined);
        }
    });


    // LINK VERIFY WORKER
    // console.log("Starting link verifier");
    // linkvalidator(getAllWinstoryLinks(), "WINSTORY");
    // linkvalidator(getAllAssetLinks(), "ASSET");
    // EXPIERY VERIFY WORKER

}

exports.triggerWorkeronce = (req, res) => {
    webworkertrigger();
    if (res != undefined) {
        res.send({ "status": "worker triggered once" });
    }
}

exports.triggerWorkers = (req, res) => {
    webworker();
    if (res != undefined) {
        res.send({ "status": "worker triggered" });
    }
}


getAllWinstoryLinks = () => {

    try {
        const connection = getDb();
        return connection.query(`SELECT * from ASSET_WINSTORY_LINKS`, [],
            {
                outFormat: oracledb.OBJECT
            })
    } catch (err) {
        console.log(JSON.stringify(err));
    };

}

getAllAssetLinks = () => {

    try {
        const connection = getDb();
        return connection.query(`SELECT * from ASSET_LINKS`, [],
            {
                outFormat: oracledb.OBJECT
            });
    } catch (err) {
        console.log(JSON.stringify(err));
    };

}

linkvalidator = (list, type) => {

    if (list != undefined) {
        list.then(listdata => {
            listdata.map(link => {
                // console.log("URL > " + JSON.stringify(link));
                validateAndUpdateLinkStatus(link, type);
            })
        }).catch(err => {
            console.log("Link verifier error  " + JSON.stringify(err));
        });
    }
}

validateAndUpdateLinkStatus = (link, type) => {
    // "LINK_ID"
    axios.get(link.LINK_URL)
        .then(response => {
            link.status = "true";
        }).catch(err => {
            link.status = "false";
        }).finally(() => {
            // console.log(link.status);
            if (type === "ASSET") {
                updateAssetLinkStatus(link);
            } else if (type === "WINSTORY") {
                updateWinstoryLinkStatus(link);
            }
        });
}

updateWinstoryLinkStatus = (link) => {

    try {
        const connection = getDb();
        let updateLinkStatusSql = `update asset_winstory_links set LINK_ACTIVE=:0 where LINK_ID=:1`;
        let updateLinkStatusOptions = [link.status, link.LINK_ID];
        // console.log(JSON.stringify(updateLinkStatusOptions));
        connection.update(updateLinkStatusSql, updateLinkStatusOptions, {
            autoCommit: true
        })
            .then(res => {
                // console.log(link.LINK_ID + " > " + res.rowsAffected);
                winlinkcount++;
            });
    } catch (err) {
        console.log(JSON.stringify(err));
    };

}

updateAssetLinkStatus = (link) => {

    try {
        const connection = getDb();
        let updateLinkStatusSql = `update ASSET_LINKS set LINK_ACTIVE=:0 where LINK_ID=:1`;
        let updateLinkStatusOptions = [link.status, link.LINK_ID];
        // console.log(JSON.stringify(updateLinkStatusOptions));
        connection.update(updateLinkStatusSql, updateLinkStatusOptions, {
            autoCommit: true
        }).then(res => {
            // console.log(link.LINK_ID + " > " + res.rowsAffected);
            assetlinkCount++;
        });
    } catch (err) {
        console.log(JSON.stringify(err));
    };

}

exports.updateWorkerResult = () => {

    try {
        const connection = getDb();
        let ldapworkerstatusSql = `insert into ASSET_WORKER_TASK (WORK_TYPE,WORK_UPDATE_COUNT) values(:0,:1)`;
        let ldapworkerstatusOptions = ["LDAP_SYNC", this.userUpdateCount];
        connection.execute(ldapworkerstatusSql, ldapworkerstatusOptions, {
            autoCommit: true
        }).then(res => {
            console.log("LDAP worker task updated");
        });
    } catch (err) {
        console.log(JSON.stringify(err));
    };

    try {
        const connection = getDb();
        let assetlinkworkerstatusSql = `insert into ASSET_WORKER_TASK (WORK_TYPE,WORK_UPDATE_COUNT) values(:0,:1)`;
        let assetlinkworkerstatusOptions = ["ASSET_LINK_VERIFIER", assetlinkCount];
        // console.log(JSON.stringify(updateLinkStatusOptions));
        connection.execute(assetlinkworkerstatusSql, assetlinkworkerstatusOptions, {
            autoCommit: true
        }).then(res => {
            console.log("ASSET LINK worker task updated");
        });
    } catch (err) {
        console.log(JSON.stringify(err));
    };


    try {
        const connection = getDb();
        let winlinkworkerstatusSql = `insert into ASSET_WORKER_TASK (WORK_TYPE,WORK_UPDATE_COUNT) values(:0,:1)`;
        let winlinkworkerstatusOptions = ["WIN_LINK_VERIFIER", winlinkcount];
        // console.log(JSON.stringify(updateLinkStatusOptions));
        connection.execute(winlinkworkerstatusSql, winlinkworkerstatusOptions, {
            autoCommit: true
        }).then(res => {
            console.log("WIN LINK worker task updated");
        });
    } catch (err) {
        console.log(JSON.stringify(err));
    };
}


exports.captureSearch = (activity) => {


    // console.log("============= FILTER ==============")
    // console.log(JSON.stringify(activity));
    console.log("============= FILTER ==============")
    activity.activity_id = uniqid.process('a-');
    activity.activitygroupid = uniqid.process('ag-');

    if (activity.filters != undefined) {

        console.log(JSON.stringify(activity));


        activity.filters = activity.filters.split(',');

        activity.filters.map(filter => {
            console.log(filter + " EXIST ::: " + exclusionFilterList.indexOf(filter));
            if (filter.trim().length > 0 && exclusionFilterList.indexOf(filter) == -1) {
                try {
                    const connection = getDb();
                    let captureSearchActivitySql = `insert into ASSET_SEARCH_ACTIVITY (ACTIVITY_ID, ACTIVITY_PERFORMED_BY, ACTIVITY_FILTER, ACTIVITY_GROUP_ID, ACTIVITY_TYPE) values(:0,:1,:2,:3,:4)`;
                    let captureSearchActivityOptions = [activity.activity_id, activity.email, filter, activity.activitygroupid, "FILTER"];
                    connection.execute(captureSearchActivitySql, captureSearchActivityOptions, {
                        autoCommit: true
                    });
                } catch (err) {
                    console.log(JSON.stringify(err));
                };
            }

        })
    }


    if (activity.searchtext != undefined && activity.searchtext.length > 0) {
        let words = activity.searchtext.trim().split(" ");
        words.filter(word => {
            try {
                const connection = getDb();
                let captureSearchActivitySql = `insert into ASSET_SEARCH_ACTIVITY (ACTIVITY_ID, ACTIVITY_PERFORMED_BY, ACTIVITY_FILTER, ACTIVITY_GROUP_ID, ACTIVITY_TYPE) values(:0,:1,:2,:3,:4)`;
                let captureSearchActivityOptions = [activity.activity_id, activity.email, word, activity.activitygroupid, "FREETEXT"];
                connection.execute(captureSearchActivitySql, captureSearchActivityOptions, {
                    autoCommit: true
                });
            } catch (err) {
                console.log(JSON.stringify(err));
            };
        })

    }

}

// exports.captureSearch2 = (activity) => {

//     if (activity.filters == undefined) {
//         return;
//     } else {
//         activity.activity_id = uniqid.process('a-');
//         activity.activitygroupid = uniqid.process('ag-');
//         activity.filters = activity.filters.split(',');

//         activity.filters.map(filter => {
//             try {
//                 const connection = getDb();
//                 let captureSearchActivitySql = `insert into ASSET_SEARCH_ACTIVITY (ACTIVITY_ID, ACTIVITY_PERFORMED_BY, ACTIVITY_FILTER, ACTIVITY_GROUP_ID, ACTIVITY_TYPE) values(:0,:1,:2,:3,:4)`;
//                 let captureSearchActivityOptions = [activity.activity_id, activity.email, filter, activity.activitygroupid, "FILTER"];
//                 connection.execute(captureSearchActivitySql, captureSearchActivityOptions, {
//                     autoCommit: true
//                 });
//             } catch (err) {
//                 console.log(JSON.stringify(err));
//             };

//         })


//         if (activity.searchtext.length > 0) {
//             let searchwords = activity.searchtext.trim().split(" ");
//             // activity.searchtext.trim().split(" ").fil
//             try {
//                 const connection = getDb();
//                 let captureSearchActivitySql = `insert into ASSET_SEARCH_ACTIVITY (ACTIVITY_ID, ACTIVITY_PERFORMED_BY, ACTIVITY_FILTER, ACTIVITY_GROUP_ID, ACTIVITY_TYPE) values(:0,:1,:2,:3,:4)`;
//                 let captureSearchActivityOptions = [activity.activity_id, activity.email, activity.searchtext, activity.activitygroupid, "FREETEXT"];
//                 let options = {
//                     autoCommit: true,   // autocommit if there are no batch errors
//                     batchErrors: true,  // identify invalid records; start a transaction for valid ones
//                     bindDefs: [         // describes the data in 'binds'
//                         { type: oracledb.STRING, maxSize: 20 },
//                         { type: oracledb.STRING, maxSize: 20 }
//                     ]
//                 };
//                 connection.execute(captureSearchActivitySql, captureSearchActivityOptions, {
//                     autoCommit: true
//                 });
//             } catch (err) {
//                 console.log(JSON.stringify(err));
//             };
//         }
//     }
// }

exports.updateUserLob = (req, res) => {

    if (req != undefined) {
        res.send({ "status": "worker triggered" });
    }
    try {
        const connection = getDb();
        let getallactiveusersql = `select a.user_email, a.user_lob,a.user_manager_email,b.LOB_LEADER_LOB 
        from asset_user a left join asset_lob_leader b on  a.user_email=b.lob_leader_email and b.lob_ldap_active=1
        where a.USER_MODIFIED=0`;
        // console.log(JSON.stringify(updateLinkStatusOptions));
        connection.execute(getallactiveusersql, {}, {
            outFormat: oracledb.OBJECT
        }).then(data => {

            console.log("Data received")
            // GET USER LIST
            let userList = data.rows;

            // GET LOB LEADERS
            let lobleads = userList.filter((user => {
                return user.LOB_LEADER_LOB != null;
            }))
            updateLob(userList, lobleads);


        });
    } catch (err) {
        console.log("=> " + JSON.stringify(err));
        if (res != undefined) {
            res.send({ "status": "error triggered" });
        }

    };

}

let updateLob = (userList, lobleads) => {
    let leadermap = lobleads.reduce((map, obj) => {
        map[obj.USER_EMAIL] = obj;
        return map;
    }, {});


    lobleads.forEach(lead => {
        let leaduser = userList.find(obj => {
            return obj.USER_EMAIL == lead.USER_EMAIL;
        })
        leaduser.USER_LOB = lead.LOB_LEADER_LOB;

        updateLobForDirectReportList(leadermap, userList, lead, lead.LOB_LEADER_LOB);

    })

    syncLobusermappingtodb(userList);
}

let syncLobusermappingtodb = (userList) => {

    const connection = getDb();

    // CREATE BIND VARIABLES
    let binddata = []

    userList.map(user => {
        let values = [];
        values.push(user.USER_LOB);
        values.push(user.USER_EMAIL);
        binddata.push(values);
    });
    if (binddata.length > 0) {


        let createLinksSql = `update asset_user set USER_LOB=:1 where USER_EMAIL=:2`;
        let options = {
            autoCommit: true,   // autocommit if there are no batch errors
            batchErrors: true,  // identify invalid records; start a transaction for valid ones
            bindDefs: [         // describes the data in 'binds'
                { type: oracledb.STRING, maxSize: 200 },
                { type: oracledb.STRING, maxSize: 200 }
            ]
        };

        console.log("Executing LOB update. . .");
        connection.executeMany(createLinksSql, binddata, options, (err, result) => {
            console.log("Executed");
            // res.send({"status":"user LOB updated successfully"});
            if (err || result.rowsAffected == 0)
                console.log("Error while mapping lob data :" + err);
            else {
                console.log("Result is:", JSON.stringify(result));
            }

        });
    }
}


let updateLobForDirectReportList = (leadermap, userList, lead, lob) => {
    let reports = userList.filter(user => {
        return user.USER_MANAGER_EMAIL == lead.USER_EMAIL;
    })
    reports.forEach(user => {
        if (leadermap[user.USER_EMAIL] == undefined) {
            user.USER_LOB = lead.LOB_LEADER_LOB;
        } else {
            user.USER_LOB = leadermap[user.USER_EMAIL].USER_LOB;
        }
        updateLobForDirectReportList(leadermap, userList, user, lob);
    })

}

