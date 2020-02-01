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

exports.findUserByEmail = (email, res) => {
    console.log("finding user with >> " + email);
    const connection = getDb();
    let findUserSql = "select * from ASSET_USER where user_email=:0";
    let finduseroption = [email]
    connection.execute(findUserSql, finduseroption).then(result => {
        if (result.rows.length === 0) {
            res.json({ exist: "no" })
        } else {
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
                        leader: false
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
                        leader: true
                    }

                    res.json(userJson);
                }
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
                console.log("Could not found user. . .");
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
            console.log("Could not found user. . .");
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
            console.log("Could not found user. . .");
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
            console.log("Could not found user. . .");
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

exports.fetchNotifications = (req, res) => {

    const connection = getDb();
    let getNotificationSql = `select * from asset_winstory_notifications`;
    connection.query(getNotificationSql, [], {
        autoCommit: true,
        outFormat: oracledb.OBJECT
    }).then(notification => {
        console.log("notification fetched successfully . . .")
        res.status(200).json(notification);
    }).catch(err => {
        console.log("notification fetching failed . . . "+JSON.stringify(err));
    })
}

exports.markNotificationRead=(param,res)=>{
    console.log(param.id+" READ >>> "+param.email);
    res.send({'msg':"success"});

}
exports.markNotificationDelete=(param,res)=>{
    console.log(param.id+" DELETE >>> "+param.email);
    res.send({'msg':"success"});
}

exports.createNotification = (notification, user) => {
    console.log("Registering notification step 2");
    let notification_id = uniqid();
    const connection = getDb();
    let createNotificationSql = `insert into asset_winstory_notifications (notfication_id,NOTIFICATION_CONTENT_ID,NOTIFICATION_CONTENT_TYPE,NOTIFICATION_CONTENT_NAME) values (:0,:1,:2,:3)`;
    let notificationOptions = [notification_id, notification.NOTIFICATION_CONTENT_ID, notification.NOTIFICATION_CONTENT_TYPE, notification.NOTIFICATION_CONTENT_NAME]

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