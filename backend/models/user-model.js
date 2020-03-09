const getDb = require('../database/db').getDb;
let fs = require('fs');
let uniqid = require('uniqid');
const oracledb = require('oracledb');
oracledb.fetchAsString = [oracledb.CLOB];
let log = require('log4js').getLogger("user-model");
let path = require('path');
let base64 = require('base-64');
const axios = require('axios');
const emailnotification = require('./email-notification');
const worker = require('../utility/worker');
// GIT CHECK IN TEST

exports.saveuserlogin = (activity, res) => {
    const connection = getDb();
    let captureloginsql = `insert into ASSET_USER_ACTIVITY (ACTIVITY_BY_USER_EMAIL,ACIVITY_BY_USERNAME,ACTIVITY_TYPE,ACTIVITY_PLATFORM) values(:0,:1,:2,:3)`;
    let captureloginOption = [activity.email, activity.name, activity.type, activity.platform];

    connection.execute(captureloginsql, captureloginOption, {
        outFormat: oracledb.Object,
        autoCommit: true
    })
        .then(data => {
            res.status(200).send({ "status": "capture success" });
        })
}

exports.fetchuseractivity = (res) => {

    const connection = getDb();
    let fetchUserActivitySql = `select * from asset_user_activity order by activity_on desc`;
    connection.query(fetchUserActivitySql, {}, {
        outFormat: oracledb.OBJECT
    })
        .then(data => {
            res.send(data);
        })
}
exports.saveUser = (user, res) => {
    const connection = getDb();
    let findUserSql = "select * from ASSET_USER where user_email=:0";
    let finduseroption = [user.email]
    connection.execute(findUserSql, finduseroption).then(result => {

        // CHECK IF THE USER RECORD DOESN'T EXIST THEN CREATE
        if (result.rows.length === 0) {
            let user_id = uniqid();
            console.log(user_id)
            let addusersql = `INSERT into ASSET_USER (USER_ID,USER_NAME,USER_EMAIL,USER_ROLE,USER_LOCATION,USER_PILLAR,USER_LOB,USER_PHONE,USER_CREATED_ON,USER_MODIFIED_ON,USER_MODIFIED) values(:0,:1,:2,:3,:4,:5,:6,:7,:8,:9,:10)`;
            let adduseroptions = [user_id, user.name, user.email, "user", user.location, user.pillar, user.lob, user.phone, new Date(), new Date(), 0]

            connection.execute(addusersql, adduseroptions, {
                outFormat: oracledb.Object,
                autoCommit: true
            }).then(result => {
                console.log("user added", result);
                this.findUserByEmail(user.email, res);
            }).catch(err => {
                console.log("User add error : " + err);
            })
        } else {
            let updateUserSql = "update ASSET_USER set USER_LOCATION=:0, USER_PILLAR=:1, USER_NAME=:2,USER_PHONE=:4, USER_MODIFIED_ON=:5,USER_MODIFIED=:6 where USER_EMAIL=:7"
            let updateUserOptions = [user.location, user.pillar, user.name, user.phone, new Date(), 1, user.email];
            connection.execute(updateUserSql, updateUserOptions, {
                autoCommit: true
            }).then(result => {
                console.log("user updated", result);
                this.findUserByEmail(user.email, res);
            }).catch(err => {
                console.log("User add error : " + err);
                res.status(500).json({ status: "failed", msg: JSON.stringify(err) });
            })
        }
    }).catch(err => {
        console.log("Error: " + err)
    })
}
//select * from ASSET_DEVICETOKEN where user_email='amit.pati@oracle.com'
exports.findUserByEmail = (email, res) => {
    console.log("finding user with >> " + email);
    const connection = getDb();
    let findUserSql = "select * from ASSET_USER where user_email=:0";
    let finduseroption = [email]
    connection.execute(findUserSql, finduseroption).then(result => {
        if (result.rows.length === 0) {
            res.json({ exist: "no" })
        } else {

            let findDeviceTokenSQL = "select * from ASSET_DEVICETOKEN where user_email=:0";
            let option = [email]
            connection.query(findDeviceTokenSQL, option).then(token => {

                let findLeaderSql = "select * from ASSET_LOB_LEADER where LOB_LEADER_EMAIL=:0";
                let findLeaderoption = [email]
                connection.execute(findLeaderSql, findLeaderoption).then(leader => {
                    if (leader.rows.length === 0) {
                        let userJson = {
                            exist: "yes",
                            name: result.rows[0][1],
                            role: result.rows[0][4],
                            location: result.rows[0][6],
                            pillar: result.rows[0][7],
                            lob: result.rows[0][10],
                            phone: result.rows[0][13],
                            leader: false,
                            devicetokens: token
                        }

                        res.json(userJson);
                    } else {
                        let userJson = {
                            exist: "yes",
                            name: result.rows[0][1],
                            role: result.rows[0][4],
                            location: result.rows[0][6],
                            pillar: result.rows[0][7],
                            lob: result.rows[0][10],
                            phone: result.rows[0][13],
                            leader: true,
                            devicetokens: token
                        }

                        res.json(userJson);
                    }
                })
            })

            //res.json(userJson);
        }
    })
}


exports.saveProfileImage = (host, image, platform, email, res) => {
    console.log("Client: " + platform);

    // READ THE IMAGE EXTENSION
    let imageext = image.split(';base64,')[0].split('/')[1];

    // READ THE BASE64 IMAGE DATA FROM THE PAYLOAD
    image = image.split(';base64,').pop();

    let filename = base64.encode(email) + "." + imageext;
    let foldername = "userprofileimages";
    // let filelocation = path.join(__dirname, '..', 'public', '/' + foldername + '/');
    let filelocation = path.join(__dirname, '../../../..', 'mnt/ahfs', '/' + foldername + '/');

    saveprofileImagefileto(image, filelocation + filename).then((data) => {
        console.log(data)
        const connection = getDb();
        let relativepath = foldername + "/" + filename;
        let updateProfileImageSql = "update ASSET_USER SET user_profile_image='" + relativepath + "',USER_MODIFIED=1 where user_email='" + email + "'";//"update ASSET_USER SET user_profile_image=:0 where user_email=:1";

        // console.log("SQL > > > "+updateProfileImageSql);
        connection.execute(updateProfileImageSql, [], {
            autoCommit: true
        }).then(result => {
            if (result.rowsAffected === 0) {
                console.log("Could not found user. . . saveprofileImagefileto");
                res.status(404).json({ status: "failed", msg: "Could not found user with email " + email });
            } else {
                console.log("Profile image updated successfully ");
                res.json({ status: "success", msg: "Profile image updated successfully", image: "http://" + host + "/" + foldername + "/" + filename })
            }

        }).catch(err => {
            console.log("Error occurred while saving profile image : " + err);
            res.json({ status: "failed", msg: JSON.stringify(err) })
        })
    }).catch(err => {
        console.log("Error while profile image save " + err);
    })
}


saveprofileImagefileto = (base64Image, filelocation) => {
    console.log(">> " + filelocation);
    return new Promise((resolve, reject) => {
        fs.writeFile(filelocation, base64Image, { encoding: 'base64' }, (err) => {
            if (err) reject(err)
            resolve("File saved successfully");
        })
    })

}


exports.getProfileImage = (host, email, res) => {
    const connection = getDb();
    let fetchProfileImageSql = "select USER_PROFILE_IMAGE from ASSET_USER where USER_EMAIL=:0";
    let fetchProfileImageOption = [email];

    connection.execute(fetchProfileImageSql, fetchProfileImageOption, {
        autoCommit: true
    }).then(result => {
        if (result.rows.length > 0 && result.rows[0][0] != null) {
            res.json({ status: "success", image: "http://" + host + "/" + result.rows[0][0] })
        } else {
            res.json({ status: "failed", msg: "No image is found" })
        }

    }).catch(err => {
        console.log("Error occurred while fetching profile image : " + err);
        res.json({ status: "failed", msg: JSON.stringify(err) })
    })
}

exports.deleteUser = (email, res) => {
    const connection = getDb();
    let deleteUserSql = "delete from ASSET_USER where user_email=:0";
    let deleteUserOptions = [email];

    connection.execute(deleteUserSql, deleteUserOptions, {
        autoCommit: true
    }).then(result => {
        // DELETE USER PREFERENCES
        deleteUserPreferences(email);

        // DELETE FAVORITE ASSETS
        deleteUserFavoriteAssets(email);

        if (result.rowsAffected === 0) {
            console.log("Could not found user. . . deleteUser");
            res.status(404).json({ status: "failed", msg: "Could not found user with email " + email });
        } else {
            console.log("User deleted successfully");

            res.json({ status: "success", msg: "user deleted successfully" })
        }

    }).catch(err => {
        console.log("Error occurred while deleting user : " + err);
        res.status(500).json({ status: "failed", msg: JSON.stringify(err) })
    })

}

deleteUserPreferences = (email) => {
    const connection = getDb();
    let deleteUserPreferencesSql = "delete from ASSET_PREFERENCES where user_email=:0";
    let deleteUserPreferencesOptions = [email];
    connection.execute(deleteUserPreferencesSql, deleteUserPreferencesOptions, {
        autoCommit: true
    }).then(result => {
        if (result.rowsAffected === 0) {
            console.log("Could not found user. . . deleteUserPreferences");
            // res.status(404).json({ status: "failed", msg: "Could not found user with email " + email });
        } else {
            console.log("User preferences deleted successfully");
            // res.json({ status: "success" })
        }

    }).catch(err => {
        console.log("Error occurred while deleting user preferences : " + err);
        // res.status(500).json({ status: "failed", msg: JSON.stringify(err) })
    })
}

deleteUserFavoriteAssets = (email) => {
    const connection = getDb();
    let deleteUserFavoriteAssetsSql = "delete from ASSET_LIKES where like_by=:0";
    let deleteUserFavoriteAssetsOptions = [email];
    connection.execute(deleteUserFavoriteAssetsSql, deleteUserFavoriteAssetsOptions, {
        autoCommit: true
    }).then(result => {
        if (result.rowsAffected === 0) {
            console.log("Could not found user. . . deleteUserFavoriteAssets");
            // res.status(404).json({ status: "failed", msg: "Could not found user with email " + email });
        } else {
            console.log("User favorite assets deleted successfully");
            // res.json({ status: "success" })
        }

    }).catch(err => {
        console.log("Error occurred while deleting user favorite assets : " + err);
        // res.status(500).json({ status: "failed", msg: JSON.stringify(err) })
    })
}

exports.saveRequestForDemo = (request, res) => {
    const connection = getDb();
    let saveDemoRequestSql = `insert into ASSET_REQUEST_DEMO (
        REQUESTOR_NAME,
        REQUEST_MOBILE,
        REQUEST_LOCATION,
        REQUEST_PILLAR,
        ASSET_ID,
        USER_EMAIL,
        REQUEST_CREATED_ON,
        REQUEST_DEMO_DATE,
        REQUEST_OPPORTUNITY_ID,
        REQUEST_DEMO_NOTE,
        REQUEST_DEMO_CUSTOMER_NAME) values(:0,:1,:2,:3,:4,:5,:6,:7,:8,:9,:10)`;
    let saveDemoRequestOptions = [
        request.name,
        request.mobile,
        request.location,
        request.pillar,
        request.assetid,
        request.email,
        new Date(),
        request.request_demo_date,
        request.request_opportunity_id,
        request.request_demo_note,
        request.request_demo_customer_name];

    connection.execute(saveDemoRequestSql, saveDemoRequestOptions, {
        autoCommit: true
    }).then(result => {
        if (result.rowsAffected === 0) {
            console.log("Could not capture demo request. . .");
            res.status(404).json({ status: "failed", msg: "Could not capture demo request " });
        } else {
            console.log("Demo request is captured. . .");
            emailnotification.triggerEmailNotificationforRequestDemo(request);
            res.json({ status: "success", msg: "Demo request saved and email notification sent successfully" })
        }

    }).catch(err => {
        console.log("Error occurred while saving demo request : " + JSON.stringify(err));
        res.status(500).json({ status: "failed", msg: JSON.stringify(err) })
    })

}



exports.getLdapInfo = () => {
    return new Promise((resolve, reject) => {
        axios.get('https://apex.oracle.com/pls/apex/ldap_info/hierarchy/adithya.karthik.krishna@oracle.com')
            .then(data => {
                console.log(data.data.items)
                populateEmployeeData(data.data.items, data.data.items.length)
                    .then(emp => {
                        resolve(emp)
                    })
            })
    })
}
var emp = []
const populateEmployeeData = (managerArray, n) => {
    return new Promise((resolve, reject) => {
        if (n === 0) {
            return
        }
        else {
            for (i = n - 1; i >= 0; i--) {
                axios.get('https://apex.oracle.com/pls/apex/ldap_info/hierarchy/' + managerArray[i].mail)
                    .then(details => {
                        console.log(i)
                        populateEmployeeData(details.data.items, details.data.items.length)
                        //console.log(details.data.items)

                    })


            }
            // return

            // axios.get('https://apex.oracle.com/pls/apex/ldap_info/get/getUserAttr/'+managerArray[n-1].mail)

        }
    })
}



exports.getLdapInfoComplete = () => {
    return new Promise((resolve, reject) => {
        // console.log(getDb())
        purgeUserRecords2();
        axios.get('https://apex.oracle.com/pls/apex/ldap_info/getOverall/all_employees')
            .then(details => {
                // console.log(details)
                createOrUpdateUser2(details.data.items)
                resolve(details.data)
            }).catch(function onError(error) {
                //connectionresetHierCount++;
                console.log("####################################################");
                console.log(" Some screw up " + error);
                console.log("====================================================");
            })
    })
}


exports.getAllLinks = () => {
    const connection = getDb();
    return connection.execute(`SELECT * from ASSET_WINSTORY_LINKS`,
        {
            outFormat: oracledb.OBJECT
        }).then(result => {
            console.log("Links read");
        })
}

let count2 = 0;
const createOrUpdateUser2 = (userdataArr) => {
    console.log("user Count > " + userdataArr.length)
    let updateCount = 0;
    userdataArr.forEach((userdata, i) => {
        updateCount = i;
        count2++
        console.log("USER : " + i)

        try {
            if (userdata.telephonenumber === null) {
                userdata.telephonenumber = userdata.orclbeehivephonenumber
            }
            console.log("===============================================: " + userdata.manager);
            console.log(JSON.stringify(userdata));
            userdata.lob = "Others";
            let manager_email = " ";
            if (userdata.manager != null) {
                manager_email = userdata.manager.split(',')[0].split('=')[1].toLowerCase().replace(/_/g, ".") + "@oracle.com";
            }
            // console.log(manager_email)
            const connection = getDb();
            let saveUserSql = `insert into asset_user (USER_ID,USER_NAME,USER_EMAIL,USER_ROLE,USER_LOCATION
                   ,USER_LOB,USER_MANAGER_EMAIL,USER_CREATED_ON,USER_MODIFIED,USER_PHONE,USER_PILLAR) values(:0,:1,:2,:3,:4,:5,:6,:7,:8,:9,:10)`;
            let saveUserOptions = [userdata.uid1, userdata.displayname, userdata.mail, "user", userdata.city, userdata.lob, manager_email, new Date(), 0, userdata.telephonenumber, 'N/A'];

            console.log("Executing. . .");
            connection.execute(saveUserSql, saveUserOptions, {
                autoCommit: true
            }).then(result => {

                if (result.rowsAffected === 0) {
                    console.log("User record creation failed . .");
                } else {
                    createduser++;
                    console.log("User creation successful. . . " + createduser + "/ User found . . ." + count + "/ Connection reset . . ." + connectionresetCount + "/" + connectionresetHierCount);

                }

            }).catch(err => {

                console.log(JSON.stringify(err));
                // console.log("User creation failed at db level request  for USER: " + name + i + JSON.stringify(err));
                // if (i >= userdataArr.length - 1) {
                //     connection.execute("BEGIN UPDATELOB; END;", {}, {
                //         autoCommit: true
                //     })
                //         .then(res => {
                //             console.log("LOB updated");
                //             worker.updateWorkerResult();
                //         })
                //         .catch(err => {
                //             console.log(err)
                //         })
                // }
            })

        } catch (err) {
            console.log(error)
        }

    })
    console.log(updateCount + " - User record updated");
    worker.userUpdateCount = updateCount;
}

exports.fetchNotifications = (param, res) => {
    let email = param.email;
    let readlist = [];
    let unreadlist = [];
    let notificationObj = [];
    const connection = getDb();
    let getNotificationSql = `select * from asset_winstory_notifications`;
    connection.query(getNotificationSql, [], {
        autoCommit: true,
        outFormat: oracledb.OBJECT
    }).then(notification => {
        notification.filter(notification => {
            if (notification.NOTIFICATION_DELETE == undefined || !notification.NOTIFICATION_DELETE.includes(email)) {
                if (notification.NOTIFICATION_READ != undefined && notification.NOTIFICATION_READ.includes(email)) {
                    delete notification.NOTIFICATION_READ;
                    delete notification.NOTIFICATION_DELETE;
                    readlist.push(notification);
                } else {
                    delete notification.NOTIFICATION_READ;
                    delete notification.NOTIFICATION_DELETE;
                    unreadlist.push(notification);
                }
            }
        })
        notificationObj = {
            read: readlist,
            unread: unreadlist
        }
        console.log("notification fetched successfully . . .")
        res.send(notificationObj);
    })
}

exports.markNotificationRead = (param, res) => {
    console.log(param.id + " READ >>> " + param.email);
    const connection = getDb();
    let getNotificationSql = `select * from asset_winstory_notifications where notfication_id=:0`;
    let option = [param.id]
    connection.query(getNotificationSql, option, {
        autoCommit: true,
        outFormat: oracledb.OBJECT
    }).then(notifications => {
        let notification = notifications[0];
        console.log(notification.NOTIFICATION_READ);
        let readlist = notification.NOTIFICATION_READ == undefined ? "" : notification.NOTIFICATION_READ;

        if (readlist == undefined || !readlist.includes(param.email)) {
            readlist = readlist + "," + param.email;
        }
        console.log(JSON.stringify(readlist));
        let updateNotificationSql = `update asset_winstory_notifications set notification_read=:0 where notfication_id=:1`;
        let option = [readlist, param.id];
        connection.execute(updateNotificationSql, option, {
            autoCommit: true
        }).then(result => {
            console.log(JSON.stringify(result));
            res.send({ 'msg': "success" });
        })
        // res.send({ 'msg': "successS" });
    })

}
exports.markNotificationDelete = (param, res) => {
    console.log(param.id + " DELETE >>> " + param.email);
    const connection = getDb();
    let getNotificationSql = `select * from asset_winstory_notifications where notfication_id=:0`;
    let option = [param.id]
    connection.query(getNotificationSql, option, {
        autoCommit: true,
        outFormat: oracledb.OBJECT
    }).then(notifications => {
        let notification = notifications[0];
        let readlist = notification.NOTIFICATION_DELETE == undefined ? "" : notification.NOTIFICATION_DELETE;
        console.log("notification fetched successfully . . .")
        console.log(JSON.stringify(notification));

        if (readlist == undefined || !readlist.includes(param.email)) {
            readlist = readlist + "," + param.email;
        }

        console.log(JSON.stringify(readlist));
        let updateNotificationSql = `update asset_winstory_notifications set notification_delete=:0 where notfication_id=:1`;
        let option = [readlist, param.id];
        connection.execute(updateNotificationSql, option, {
            autoCommit: true
        }).then(result => {
            console.log(JSON.stringify(result));
            res.send({ 'msg': "success" });
        })
        // res.send({ 'msg': "successS" });
    })

}

const createNotification = (notification) => {
    let notification_id = uniqid();
    notification.NOTIFICATION_ID = notification_id;
    triggerDeviceNotification(notification);
    const connection = getDb();
    let createNotificationSql = `insert into asset_winstory_notifications (notfication_id,NOTIFICATION_CONTENT_ID,NOTIFICATION_CONTENT_TYPE,NOTIFICATION_CONTENT_NAME,NOTIFICATION_CONTENT_ICON) values (:0,:1,:2,:3,:4)`;
    let notificationOptions = [notification_id, notification.NOTIFICATION_CONTENT_ID, notification.NOTIFICATION_CONTENT_TYPE, notification.NOTIFICATION_CONTENT_NAME, notification.NOTIFICATION_CONTENT_ICON]

    connection.execute(createNotificationSql, notificationOptions, {
        autoCommit: true
    }).then(result => {
        if (result.rowsAffected === 0) {
            console.log("Notification creation failed . . .");
        } else {
            console.log("Notification creation successful . . .");
        }
    }).catch(err => {
        console.log("Notification creation failed . . .");
    })
}

exports.preparenotification = (contentId, contentType, host) => {

    const connection = getDb();
    if (contentType.toLowerCase().includes('asset')) {
        let getassetDetailsSql = `select asset_title,asset_thumbnail from asset_details where asset_id=:0`;
        let option = [contentId];

        connection.query(getassetDetailsSql, option, {
            autoCommit: true
        }).then(result => {
            let notification = {
                NOTIFICATION_CONTENT_ID: contentId,
                NOTIFICATION_CONTENT_NAME: result[0].ASSET_TITLE,
                NOTIFICATION_CONTENT_TYPE: contentType,
                NOTIFICATION_CONTENT_ICON: result[0].ASSET_THUMBNAIL,
                NOTIFICATION_HOST: host
            }
            createNotification(notification);
        })
    } else if (contentType.toLowerCase().includes('win')) {
        let getassetDetailsSql = `select winstory_name,winstory_thumbnail from asset_winstory_details where winstory_id=:0`;
        let option = [contentId];

        connection.query(getassetDetailsSql, option, {
            autoCommit: true
        }).then(result => {
            let notification = {
                NOTIFICATION_CONTENT_ID: contentId,
                NOTIFICATION_CONTENT_NAME: result[0].WINSTORY_NAME,
                NOTIFICATION_CONTENT_TYPE: contentType,
                NOTIFICATION_CONTENT_ICON: result[0].WINSTORY_THUMBNAIL,
                NOTIFICATION_HOST: host
            }
            createNotification(notification);
        })
    }
}

const triggerDeviceNotification = (content) => {


    const connection = getDb();
    let getdeviceTokensSql = `select device_token,device_type from asset_devicetoken`;
    let iosDevices = [];
    let androidDevices = []
    connection.query(getdeviceTokensSql, [], {
        autoCommit: true,
        outFormat: oracledb.OBJECT
    }).then(tokens => {
        console.log("+++++++++++++++ Device tokens ++++++++++++++++++")
        console.log(JSON.stringify(tokens));
        tokens.filter(token => {

            if (token.DEVICE_TYPE.toLowerCase().includes("ios")) {
                iosDevices.push(token.DEVICE_TOKEN);
            } else {
                androidDevices.push(token.DEVICE_TOKEN);
            }
        })

        let msg = {
            title: content.NOTIFICATION_CONTENT_TYPE + " is live now",
            subtitle: content.NOTIFICATION_CONTENT_NAME,
            body: content.NOTIFICATION_CONTENT_NAME,
            payload: {
                id: content.NOTIFICATION_CONTENT_ID,
                notification_id: content.NOTIFICATION_ID,
                type: content.NOTIFICATION_CONTENT_TYPE,
                body: content.NOTIFICATION_CONTENT_NAME,
                title: content.NOTIFICATION_CONTENT_TYPE + " is live now",
                icon: "http://" + content.NOTIFICATION_HOST + "/" + content.NOTIFICATION_CONTENT_ICON
            }
        }

        console.log("- - - - - - IOS - - - - - - ");
        console.log(iosDevices);
        sendToAPNS(msg, iosDevices);

        console.log("- - - - -  ANDROID - - - - - - ");
        console.log(JSON.stringify(androidDevices));
        sendToFCM(msg, androidDevices);
    })


}
/********
 * 
 * Function for android push notification
 * 
 * Arg :
 *      message: object
 *      devicetokens: comma separetd android token only
 * 
 */
function sendToFCM(msg, devicetokens) {
    var FCM = require('fcm-node');
    var serverKey = 'AIzaSyAR7soGZPPOkDROmH0zXOPlp_rIEVmRomg'; //put your server key here
    var fcm = new FCM(serverKey);
    console.log(JSON.stringify(devicetokens.length));
    var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
        //to: devicetokens,
        registration_ids: devicetokens,
        notification: {
            title: msg.title,
            body: msg.body,
            image: msg.payload.icon

        },
        data: {
            id: msg.payload.id,
            notification_id: msg.payload.notification_id,
            type: msg.payload.type,
            title: msg.payload.title,
            body: msg.payload.body,
        }
    };
    console.log("-------- ANDROID MSG ------------");
    console.log(JSON.stringify(msg));
    console.log("-------- ANDROID PAYLOAD ------------");
    console.log(JSON.stringify(message));
    fcm.send(message, function (err, response) {
        if (err) {
            console.log(err)
        } else {
            console.log("Successfully sent android push message with response: ", response);
        }
    });
}

/********
 * 
 * Function for ios push notification
 * 
 * Arg :
 *      message: object
 *      devicetokens: comma separetd ios token only
 * 
 */

function sendToAPNS(msg, devicetokens) {
    var apn = require('apn');
    var options = {
        cert: '/u01/ahweb/backend/certs/cert.pem',
        key: '/u01/ahweb/backend/certs/key.pem',
        production: true
    };
    var apnConnection = new apn.Connection(options);
    let myDevice = devicetokens;
    var note = new apn.Notification();
    note.expiry = Math.floor(Date.now() / 1000) + 3600;
    note.badge = 0;
    note.sound = "ping.aiff";
    note.alert = {
        "title": msg.title,
        "subtitle": msg.payload.body
    }
    note.payload = {
        'id': msg.payload.id,
        'notification_id': msg.payload.notification_id,
        'type': msg.payload.type,
        'title': msg.payload.title,
        'body': msg.payload.body
    };
    console.log("-------- IOS MSG ------------");
    console.log(JSON.stringify(msg));
    console.log("-------- IOS PAYLOAD ------------");
    console.log(JSON.stringify(note));
    apnConnection.pushNotification(note, myDevice)
    apnConnection.on('error', function (error) {
        console.error('APNS: Initialization error', error);
    });
    // A submission action has completed. This just means the message was submitted, not actually delivered.
    apnConnection.on('completed', function (a) {
        console.log('APNS: Completed sending', a);
    });
    console.log('ios push message sent successfully')
}

const purgeUserRecords2 = () => {
    const connection = getDb();
    let truncateUserSql = `delete from asset_user where USER_MODIFIED=0`;
    connection.execute(truncateUserSql, [], {
        autoCommit: true
    }).then(result => {
        if (result.rowsAffected === 0) {
            console.log("User record truncation failed . . . ");
        } else {
            createduser++;
            console.log("User record truncation successful. . . " + "/" + count);

        }

    }).catch(err => {
        // console.log("User record truncation  failed at db level request : " + JSON.stringify(err));
    })
}

exports.findAllSearchedKeywordsByUser = (params) => {
    const connection = getDb();
    let email = params.email;
    let fetchKeywordByUserSQL = `select distinct a.activity_filter,a.activity_type,b.filter_name 
    from asset_search_activity a full outer join asset_filter b 
    on a.activity_filter=b.filter_id
    where activity_performed_by='`+ email + `'`;
    let options = [];
    return new Promise((resolve, reject) => {
        connection.query(fetchKeywordByUserSQL, options, {
            autoCommit: true,
            outFormat: oracledb.OBJECT
        }).then(result => {
            resolve(result);
        }).catch(err => {
            reject({ "msg": "error while fetching the keywords " + err });
        })
    })
}

exports.deleteKeyWordsByUser = (body, params) => {

    const connection = getDb();
    let email = params.email;
    console.log(`Email: ${email}`);
    console.log(`Body : ${JSON.stringify(body)}`);
    let keywordsList = "'" + body.keywords + "'";
    keywordsList = keywordsList.replace(/,/g, "','");
    let deleteKeywordbyuserSQL = `delete from asset_search_activity where activity_performed_by='` + email + `' and activity_filter in (` + keywordsList + `)`;
    console.log(`Query: ${deleteKeywordbyuserSQL}`);
    return new Promise((resolve, reject) => {
        connection.execute(deleteKeywordbyuserSQL, [], {
            autoCommit: true
        }).then(result => {
            resolve({ "msg": "keywords deleted successfully" });
        }).catch(err => {
            reject({ "msg": "error while fetching the keywords " + err });
        })
    })
}


exports.updateRawUsers = (userdata) => {

    const connection = getDb();
    console.log("Received USER Records > " + JSON.stringify(userdata.length));
    let count = 0;

    return new Promise((resolve, reject) => {

        let createUserSql = `insert into asset_user_raw (MAIL,DISPLAYNAME,CITY,ORCLBEEHIVEPHONENUMBER,MANAGER) values(:1,:2,:3,:4,:5)`;

        console.log("Executing . . .");
        userdata.map(user => {
            count++;
            let values = [user.mail, user.displayname, user.city, user.orclbeehivephonenumber, user.manager];

            // console.log("Options: "+JSON.stringify(values));
            connection.execute(createUserSql, values, {
                autoCommit: true
            }, (err, result) => {
                console.log("Executed . . .");
                if (err || result.rowsAffected == 0) {
                    console.log("Error while saving User records :" + err);
                    reject("Couldn't process user records");

                }
                else {
                    console.log(count + " Result is:" + JSON.stringify(result));
                }
            })
        })
        resolve("Data Accepted " + count);
    })
}

exports.updateUserLob = () => {
    const connection = getDb();
    return new Promise((resolve, reject) => {
        connection.execute("BEGIN SYNCLDAPUSER; END;", [], {
            autoCommit: true
        }).then(result => {
            console.log(JSON.stringify(result));
            resolve(result);
        }).catch(err => {
            console.log("Error : " + err);
            reject(err);
        })
    })
}
exports.truncateAllUserData = () => {
    const connection = getDb();
    return new Promise((resolve, reject) => {
        connection.execute(`truncate table ASSET_USER_RAW`, [], {
            autoCommit: true
        }).then(result => {
            resolve({ msg: JSON.stringify(result) });
        })
    })
}

// exports.updateRawUsers = (userdata) => {

//     const connection = getDb();
//     let binddata = [];
//     console.log("Received USER Records > " + JSON.stringify(userdata.length));


//     userdata.map(user => {
//         let value = [];
//         value.push(user.mail);
//         value.push(user.displayname);
//         value.push(user.city);
//         value.push(user.orclbeehivephonenumber);
//         value.push(user.manager);

//         binddata.push(value);
//     })
//     console.log("BindData >> " + JSON.stringify(binddata));
//     return new Promise((resolve, reject) => {
//         connection.execute(`truncate table ASSET_USER_RAW`, [], {
//             autoCommit: true
//         }).then(result => {

//             let createUserSql = `insert into asset_user_raw (MAIL,DISPLAYNAME,CITY,ORCLBEEHIVEPHONENUMBER,MANAGER) values(:1,:2,:3,:4,:5)`;
//             let options = {
//                 autoCommit: true,   // autocommit if there are no batch errors
//                 batchErrors: true,  // identify invalid records; start a transaction for valid ones
//                 bindDefs: [         // describes the data in 'binds'
//                     { type: oracledb.STRING, maxSize: 500 },
//                     { type: oracledb.STRING, maxSize: 500 },
//                     { type: oracledb.STRING, maxSize: 500 },
//                     { type: oracledb.STRING, maxSize: 500 },
//                     { type: oracledb.STRING, maxSize: 500 }
//                 ]
//             };
//             console.log("Executing . . .");
//             connection.execute(createUserSql, binddata, options, (err, result) => {
//                 console.log("Executed . . .");
//                 if (err || result.rowsAffected == 0) {
//                     console.log("Error while saving User records :" + err);
//                     reject("Couldn't process user records");

//                 }
//                 else {
//                     console.log("Result is:", JSON.stringify(result));
//                     resolve("Data Accepted")
//                 }
//             })

//         })
//     })
// }