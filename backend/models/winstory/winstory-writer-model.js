const getDb = require('../../database/db').getDb;
var uniqid = require('uniqid');
const oracledb = require('oracledb');
oracledb.fetchAsString = [oracledb.CLOB];
const path = require('path');
let base64 = require('base-64');
let fs = require('fs');
const usermodel = require('../user-model');

const emailnotification = require('../email-notification');

exports.createWinstory = (host, story, res) => {
    const connection = getDb();
    let newAssetid = uniqid.process("WS-");
    let insertwinstorysql = `Insert into ASSET_WINSTORY_DETAILS (WINSTORY_ID,
        WINSTORY_NAME,
        WINSTORY_CUSTOMER_NAME,
        WINSTORY_DEAL_CYCLE_TIME,
        WINSTORY_DEAL_SIZE,
        WINSTORY_PARTNER,
        WINSTORY_RENEWAL,
        WINSTORY_APPLICATION_INSTALL,
        WINSTORY_IMPERATIVE,
        WINSTORY_REPS_SE,
        WINSTORY_BUSSINESS_DRIVER,
        WINSTORY_SALES_PROCESS,
        WINSTORY_LESSON_LEARNT,
        WINSTORY_STATUS,
        WINSTORY_CREATED_BY,
        WINSTORY_CHANNEL,
        WINSTORY_FISCAL_QUARTER,
        WINSTORY_SOLUTION_USECASE,
        WINSTORY_COMPETIION,
        WINSTORY_CREATED_ON,
        WINSTORY_MODIFIED_ON,
        WINSTORY_MAPPED_L2_FILTERS,
        WINSTORY_OTHER_FILTER,
        WINSTORY_USECASE,
        WINSTORY_CUSTOMER_IMPACT,
        WINSTORY_CONSULTING_Q1,
        WINSTORY_CONSULTING_Q2,
        WINSTORY_CONSULTING_Q3,
        WINSTORY_CONSULTING_Q4) values (:0,:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20,:21,:22,:23,:24,:25,:26,:27,:28)`
    let insertwinstoryOption = [
        newAssetid,
        story.WINSTORY_NAME,
        story.WINSTORY_CUSTOMER_NAME,
        story.WINSTORY_DEAL_CYCLE_TIME,
        story.WINSTORY_DEAL_SIZE,
        story.WINSTORY_PARTNER,
        story.WINSTORY_RENEWAL,
        story.WINSTORY_APPLICATION_INSTALL,
        story.WINSTORY_IMPERATIVE,
        story.WINSTORY_REPS_SE,
        story.WINSTORY_BUSSINESS_DRIVER,
        story.WINSTORY_SALES_PROCESS,
        story.WINSTORY_LESSON_LEARNT,
        story.WINSTORY_STATUS,
        story.WINSTORY_CREATED_BY.toLowerCase(),
        story.WINSTORY_CHANNEL,
        story.WINSTORY_FISCAL_QUARTER,
        story.WINSTORY_SOLUTION_USECASE,
        story.WINSTORY_COMPETIION,
        story.WINSTORY_CREATED_ON,
        new Date(),
        story.MAPPED_FILTERS.l2.toString(),
        JSON.stringify(story.WINSTORY_OTHER_FILTER),
        story.WINSTORY_USECASE,
        story.WINSTORY_CUSTOMER_IMPACT,
        story.WINSTORY_CONSULTING_Q1,
        story.WINSTORY_CONSULTING_Q2,
        story.WINSTORY_CONSULTING_Q3,
        story.WINSTORY_CONSULTING_Q4

    ];

    connection.execute(insertwinstorysql, insertwinstoryOption, {
        autoCommit: true
    }).then(result => {

        if (result.rowsAffected > 0) {
            console.log(result);
            saveLinksByWinstoryId(newAssetid, story.LINKS);
            mapFilterToWinstory(story.MAPPED_FILTERS.l1, newAssetid, res);
            if (story.WINSTORY_THUMBNAIL.length > 0) {
                saveWinstoryThubnailImage(host, story.WINSTORY_THUMBNAIL, newAssetid, res);
            }

            if (story.WINSTORY_LOGO.length > 0) {
                saveWinstoryLogoImage(host, story.WINSTORY_LOGO, newAssetid, res);
            }

            usermodel.preparenotification(newAssetid, "Win", host);
            res.status(200).json({ status: "success", msg: "Winstory creation success." });
        } else {
            res.status(500).json({ status: "failed", msg: "Winstory creation failed." })
        }

    }).catch(err => {
        console.log("Error occurred while saving Winstory : " + err);
        res.json({ status: "failed", msg: JSON.stringify(err) })
    })
}

exports.saveWinstory = (host, story, res) => {
    const connection = getDb();

    let updateWinStorySql = `UPDATE ASSET_WINSTORY_DETAILS SET 
    WINSTORY_NAME=:0,
    WINSTORY_CUSTOMER_NAME=:1,
    WINSTORY_DEAL_CYCLE_TIME=:2,
    WINSTORY_DEAL_SIZE=:3,
    WINSTORY_PARTNER=:4,
    WINSTORY_RENEWAL=:5,
    WINSTORY_APPLICATION_INSTALL=:6,
    WINSTORY_IMPERATIVE=:7,
    WINSTORY_REPS_SE=:8,
    WINSTORY_BUSSINESS_DRIVER=:9,
    WINSTORY_SALES_PROCESS=:10,
    WINSTORY_LESSON_LEARNT=:11,
    WINSTORY_STATUS=:12,
    WINSTORY_CREATED_BY=:13,
    WINSTORY_CHANNEL=:14,
    WINSTORY_FISCAL_QUARTER=:15,
    WINSTORY_SOLUTION_USECASE=:16,
    WINSTORY_COMPETIION=:17,
    WINSTORY_MODIFIED_ON=:18,
    WINSTORY_MAPPED_L2_FILTERS=:19,
    WINSTORY_OTHER_FILTER=:20,
    WINSTORY_USECASE=:21,
    WINSTORY_CUSTOMER_IMPACT=:22,
    WINSTORY_CONSULTING_Q1=:23,
    WINSTORY_CONSULTING_Q2=:24,
    WINSTORY_CONSULTING_Q3=:25,
    WINSTORY_CONSULTING_Q4=:26,
    WINSTORY_CREATED_ON=:27 where WINSTORY_ID=:28`;

    let updateWinStoryOptions = [
        story.WINSTORY_NAME,
        story.WINSTORY_CUSTOMER_NAME,
        story.WINSTORY_DEAL_CYCLE_TIME,
        story.WINSTORY_DEAL_SIZE,
        story.WINSTORY_PARTNER,
        story.WINSTORY_RENEWAL,
        story.WINSTORY_APPLICATION_INSTALL,
        story.WINSTORY_IMPERATIVE,
        story.WINSTORY_REPS_SE,
        story.WINSTORY_BUSSINESS_DRIVER,
        story.WINSTORY_SALES_PROCESS,
        story.WINSTORY_LESSON_LEARNT,
        story.WINSTORY_STATUS,
        story.WINSTORY_CREATED_BY,
        story.WINSTORY_CHANNEL,
        story.WINSTORY_FISCAL_QUARTER,
        story.WINSTORY_SOLUTION_USECASE,
        story.WINSTORY_COMPETIION,
        new Date(),
        story.MAPPED_FILTERS.l2.toString(),
        JSON.stringify(story.WINSTORY_OTHER_FILTER),
        story.WINSTORY_USECASE,
        story.WINSTORY_CUSTOMER_IMPACT,
        story.WINSTORY_CONSULTING_Q1,
        story.WINSTORY_CONSULTING_Q2,
        story.WINSTORY_CONSULTING_Q3,
        story.WINSTORY_CONSULTING_Q4,
        story.WINSTORY_CREATED_ON,
        story.WINSTORY_ID];



    connection.update(updateWinStorySql, updateWinStoryOptions, {
        autoCommit: true
    }).then(result => {
        if (result.rowsAffected > 0) {
            saveLinksByWinstoryId(story.WINSTORY_ID, story.LINKS);
            mapFilterToWinstory(story.MAPPED_FILTERS.l1, story.WINSTORY_ID, res);
            if (story.WINSTORY_THUMBNAIL.length > 0) {
                saveWinstoryThubnailImage(host, story.WINSTORY_THUMBNAIL, story.WINSTORY_ID, res);
            }
            if (story.WINSTORY_LOGO.length > 0) {
                saveWinstoryLogoImage(host, story.WINSTORY_LOGO, story.WINSTORY_ID, res);
            }
            usermodel.preparenotification(story.WINSTORY_ID, "Win", host);
            res.status(200).json({ status: "success", msg: "Winstory update success." })
        } else {
            res.status(500).json({ status: "failed", msg: "Winstory updation failed." })
        }

    }).catch(err => {
        console.log("Error occurred while updating Winstory : " + err);
        res.json({ status: "failed", msg: JSON.stringify(err) })
    })

}



mapFilterToWinstory2 = (filters, winstoryid, res) => {
    const connection = getDb();

    console.log("Filter map is in progress :" + JSON.stringify(filters));
    connection.execute(`delete from ASSET_WINSTORY_FILTER_WINSTORY_MAP where WINSTORY_ID=:0`, [winstoryid], { autoCommit: true }).then(res => {
        filters.map(val => {
            let mapWinstoryToFilterSql = "Insert into ASSET_WINSTORY_FILTER_WINSTORY_MAP (FILTER_ID,WINSTORY_ID) values (:1,:2)";
            let mapWinstoryToFilterOption = [val, winstoryid];
            connection.execute(mapWinstoryToFilterSql, mapWinstoryToFilterOption, { autoCommit: true }).
                then(res => {
                    console.log("Filter map updated " + JSON.stringify(res));
                }).catch(err => {
                    console.log("Filter map updation failed " + err);
                })
        })
    });


}


mapFilterToWinstory = (filters, winstoryid, res) => {
    const connection = getDb();
    let binddata = [];
    console.log("Filter map is in progress :" + JSON.stringify(filters));
    // CREATE BIND VARIABLES
    filters.map(val => {
        let values = [];
        values.push(val);
        values.push(winstoryid);
        binddata.push(values);
    });
    if (binddata.length > 0) {
        // CLEAN UP OLD RECORDS
        connection.execute(`delete from ASSET_WINSTORY_FILTER_WINSTORY_MAP where WINSTORY_ID=:0`, [winstoryid], (err, res) => {
            // console.log("bind >>>>> " + JSON.stringify(binddata));
            if (err) {
                console.log("Old filters deleted deletion failed");
            } else {
                let createLinksSql = `Insert into ASSET_WINSTORY_FILTER_WINSTORY_MAP (FILTER_ID,WINSTORY_ID) values (:1,:2)`;
                let options = {
                    autoCommit: true,   // autocommit if there are no batch errors
                    batchErrors: true,  // identify invalid records; start a transaction for valid ones
                    bindDefs: [         // describes the data in 'binds'
                        { type: oracledb.STRING, maxSize: 20 },
                        { type: oracledb.STRING, maxSize: 20 }
                    ]
                };
                console.log("Executing. . .");
                connection.executeMany(createLinksSql, binddata, options, (err, result) => {
                    console.log("Executed");
                    if (err || result.rowsAffected == 0)
                        console.log("Error while saving filters :" + err);
                    else {
                        console.log("Result is:", JSON.stringify(result));
                    }

                });
            }

        });
    }
}






// saveLinksByWinstoryId = (winstoryid, links) => {
//     const connection = getDb();
//     // let binddata = [];

//     console.log("Link update in progress");

//     connection.execute(`delete from asset_winstory_links where WINSTORY_ID=:0`, [winstoryid])
//         .then(data => {
//             // CREATE BIND VARIABLES
//             links.map(linktype => {
//                 linktype.list.map(link => {

//                     let createLinksSql = `insert into asset_winstory_links (LINK_REPOS_TYPE,LINK_DESCRIPTION,LINK_URL,LINK_NAME,WINSTORY_ID) values(:0,:1,:2,:3,:4)`;
//                     let createLinkOptions = [linktype.type, link.link_description, link.link_url, link.link_name, winstoryid];

//                     connection.execute(createLinksSql, createLinkOptions, { autoCommit: true }).
//                         then(res => {
//                             console.log("Link updated " + JSON.stringify(res));
//                         }).catch(err => {
//                             console.log("Links updation failed " + err);
//                         })

//                 })
//             });
//         })
// }

saveLinksByWinstoryId = (winstoryid, links) => {
    const connection = getDb();
    let binddata = [];
    // console.log("Links >>>>> " + JSON.stringify(links));


    // CREATE BIND VARIABLES
    links.map(linktype => {
        linktype.list.map(link => {
            let values = [];
            values.push(link.link_name);
            values.push(linktype.type);
            values.push(link.link_description);
            values.push(link.link_url);
            values.push(winstoryid);
            binddata.push(values);
        })
    });

    if (binddata.length > 0) {

        // CLEAN UP OLD RECORDS
        connection.execute(`delete from asset_winstory_links where WINSTORY_ID=:0`, [winstoryid], (err, res) => {
            // console.log("bind >>>>> " + JSON.stringify(binddata));
            if (err) {
                console.log("Old links deleted deletion failed");
            } else {
                let createLinksSql = `insert into asset_winstory_links (LINK_NAME,LINK_REPOS_TYPE,LINK_DESCRIPTION,LINK_URL,WINSTORY_ID) values(:0,:1,:2,:3,:4)`;
                let options = {
                    autoCommit: true,   // autocommit if there are no batch errors
                    batchErrors: true,  // identify invalid records; start a transaction for valid ones
                    bindDefs: [         // describes the data in 'binds'
                        { type: oracledb.STRING, maxSize: 4000 },
                        { type: oracledb.STRING, maxSize: 16 },
                        { type: oracledb.STRING, maxSize: 4000 },
                        { type: oracledb.STRING, maxSize: 4000 },
                        { type: oracledb.STRING, maxSize: 16 } // size of the largest string, or as close as possible
                    ]
                };

                console.log("Executing. . .");
                connection.executeMany(createLinksSql, binddata, options, (err, result) => {
                    console.log("Executed");
                    if (err || result.rowsAffected == 0)
                        console.log("Error while saving links :" + err);
                    else {
                        console.log("Result is:", JSON.stringify(result));
                    }

                });
            }

        });
    }
}

uploadDoc = (winstoryid, doc) => {
    return new Promise((resolve, reject) => {
        const connection = getDb();
        let fname = doc.name.split('.')[0];
        fname = fname.replace(/ /g, '');

        const ftype = doc.name.split('.')[1];
        const uniqueId = uniqid();
        const finalFname = fname + uniqueId.concat('.', ftype);
        const baseresoursePath = path.join(__dirname, '../../../..', 'mnt/ahfs/', winstoryid);
        fs.exists(baseresoursePath, (exist) => {
            if (exist != true) {
                fs.mkdir(baseresoursePath);
            }
        })

        const uploadPath = path.join(__dirname, '../../../..', 'mnt/ahfs/', winstoryid, finalFname);
        var content = `${finalFname}`
        doc.mv(uploadPath, function (err) {
            if (err) {
                return res.status(500).send(err);
            }
        })
        connection.update(`insert into ASSET_WINSTORY_LINKS (LINK_URL,LINK_ACTIVE,LINK_DESCRIPTION,WINSTORY_ID) 
        value(?,?,?,?)`, [uploadPath, 1, doc.description, winstoryid],
            {
                outFormat: oracledb.Object,
                autoCommit: true
            }).then(res => {
                console.log("video inserted Successfully")
                resolve({ "msg": "Document saved successfully" });
            })
    })
}

saveWinstoryLogoImage = (host, image, winstoryid, res) => {

    // READ THE IMAGE EXTENSION
    let imageext = image.split(';base64,')[0].split('/')[1];

    // READ THE BASE64 IMAGE DATA FROM THE PAYLOAD
    image = image.split(';base64,').pop();

    let filename = base64.encode(winstoryid) + "_logo." + imageext;
    let filelocation = path.join(__dirname, '../../../../..', 'mnt/ahfs', '/winstorylogo/');

    savefileto(image, filelocation + filename).then((data) => {
        const connection = getDb();
        let updateThumbnailImageSql = "update asset_winstory_details set winstory_logo=:0 where winstory_id=:1";//"update ASSET_USER SET user_profile_image=:0 where user_email=:1";
        let updateThumbnailImageOptions = [`winstorylogo/${filename}`, winstoryid];

        connection.update(updateThumbnailImageSql, updateThumbnailImageOptions, {
            autoCommit: true
        }).then(result => {
            if (result.rowsAffected > 0) {
                console.log("Logo image updated successfully ");
            } else {
                console.log("Could not found winstory. . .");
            }
        }).catch(err => {
            console.log("Error occurred while saving Logo image : " + err);
        })
    }).catch(err => {
        console.log("Error while profile image save " + err);
    })
}

saveWinstoryThubnailImage = (host, image, winstoryid, res) => {

    // READ THE IMAGE EXTENSION
    let imageext = image.split(';base64,')[0].split('/')[1];

    // READ THE BASE64 IMAGE DATA FROM THE PAYLOAD
    image = image.split(';base64,').pop();

    let filename = base64.encode(winstoryid) + "." + imageext;
    let filelocation = path.join(__dirname, '../../../../..', 'mnt/ahfs', '/winstorythumbnail/');

    savefileto(image, filelocation + filename).then((data) => {
        const connection = getDb();
        let updateThumbnailImageSql = "update asset_winstory_details set winstory_thumbnail=:0 where winstory_id=:1";//"update ASSET_USER SET user_profile_image=:0 where user_email=:1";
        let updateThumbnailImageOptions = [`winstorythumbnail/${filename}`, winstoryid];

        connection.update(updateThumbnailImageSql, updateThumbnailImageOptions, {
            autoCommit: true
        }).then(result => {
            if (result.rowsAffected > 0) {
                console.log("Thumbnail image updated successfully ");
            } else {
                console.log("Could not found winstory. . .");
            }

        }).catch(err => {
            console.log("Error occurred while saving Thumbnail image : " + err);
        })
    }).catch(err => {
        console.log("Error while profile image save " + err);
    })
}

savefileto = (base64Image, filelocation) => {
    console.log("Saving winstory image : " + base64Image.length + " - " + filelocation);
    return new Promise((resolve, reject) => {
        // try {
        //     fs.unlinkSync(filelocation, (err => {
        //         if (err) {
        //             console.log("Image deletion failed");
        //         }
        //     }))
        // } catch (err) {
        //     console.log("Error  image deletion : : : " + JSON.stringify(err));
        // }
        try {
            fs.writeFileSync(filelocation, base64Image, { encoding: 'base64', mode: 0o755 });
            console.log("Image saved");
            resolve("Success");
        } catch (err) {
            console.log("Image save failed : : " + JSON.stringify(err));
        }


    });
    // return new Promise((resolve, reject) => {
    //     fs.writeFile(filelocation, base64Image, { encoding: 'base64' }, (err) => {
    //         if (err) reject(err)
    //         resolve("1")
    //     })
    // })

}

// exports.updateViewForWinstory = (winstoryId, viewed_by_email, viewed_by_userame, platform) => {
//     const connection = getDb();
//     let insertSintoryViewSql = `insert into ASSET_WINSTORY_VIEWS (WINSTORY_ID,VIEWED_BY_USERNAME,VIEWED_BY_EMAIL,CLIENT_PLATFORM,VIEW_CREATED_ON) values(:0,:1,:2,:3,:4)`;
//     let insertSintoryViewOptions = [winstoryId, viewed_by_userame, viewed_by_email, platform, new Date()];

//     return connection.execute(insertSintoryViewSql, insertSintoryViewOptions, {
//         autoCommit: true
//     })
// }

exports.updateViewForWinstory = (winstoryId, viewed_by_email, viewed_by_username, platform) => {
    console.log(winstoryId + " - " + viewed_by_email + " - " + viewed_by_username + " - " + platform);


    return new Promise((resolve, reject) => {
        let insertSintoryViewSql = `insert into ASSET_WINSTORY_VIEWS (
            VIEW_ID,
            WINSTORY_ID,
            VIEWED_BY_USERNAME,
            VIEWED_BY_EMAIL,
            VIEW_CREATED_ON,
            CLIENT_PLATFORM) values(:0,:1,:2,:3,:4,:5)`;
        let insertSintoryViewoptions = [uniqid(), winstoryId, viewed_by_username, viewed_by_email, new Date(), platform];
        const connection = getDb();
        connection.execute(insertSintoryViewSql, insertSintoryViewoptions,
            {
                outFormat: oracledb.Object,
                autoCommit: true
            })
            .then(res => {
                resolve({ "status": "view updated" })
            })
            .catch(err => {
                console.log("View update error: " + err);
                resolve(err)
            })
    })
}

exports.uploadCommentByWinStory = (reqdata, winstoryId, comment, commentBy, commentId, commentByUserName) => {
    let action;
    let sql;
    let options;
    return new Promise((resolve, reject) => {
        if (!commentId) {
            action = "inserted"
            sql = `INSERT into ASSET_WINSTORY_COMMENTS values(:COMMENT_ID,:COMMENT_COMMENT,:COMMENTBY,:COMMENTON,:WINSTORY_ID,:COMMENT_USERNAME)`;
            options = [uniqid(), comment, commentBy, new Date(), winstoryId, commentByUserName]
        }
        else {
            //console.log("in comment update section")
            action = "updated"
            sql = `UPDATE ASSET_WINSTORY_COMMENTS 
            SET COMMENT_COMMENT=:COMMENT_COMMENT
             WHERE  COMMENT_ID=:COMMENT_ID`;
            options = [comment, commentId]
        }

        const connection = getDb();
        connection.execute(sql, options,
            {
                outFormat: oracledb.Object,
                autoCommit: true
            })
            .then(res => {
                emailnotification.notificationForWinStoryComment(reqdata);
                console.log('rowsAffected:- ' + res.rowsAffected);
                resolve({ status: "comment " + action + " successfully" })
            })
            .catch(err => {
                //console.log(err)
            })
    })
}


exports.uploadLikeByWinStory11 = (assetid, likeBy, likeId, likeByUserName) => {
    let action;
    let sql;
    let options;

    return new Promise((resolve, reject) => {
        if (!likeId) {
            action = "inserted"
            sql = `INSERT into ASSET_WINSTORY_LIKES values(:LIKE_ID,:WINSTORY_ID,:LIKE_BY,:LIKE_CREATED,:LIKE_USERNAME)`;
            options = [uniqid(), assetid, likeBy, new Date(), likeByUserName]
        }
        else {
            //console.log("in like unlike section")
            action = "unliked"
            sql = `DELETE from ASSET_WINSTORY_LIKES WHERE  LIKE_ID=:LIKE_ID`;
            options = [likeId]
        }

        const connection = getDb();
        connection.execute(sql, options,
            {
                outFormat: oracledb.Object,
                autoCommit: true
            })
            .then(res => {
                resolve({ status: "like " + action + " successfully" })
            })
            .catch(err => {
                //console.log(err)
            })
    })
}
exports.uploadLikeByWinStory = (assetid, likeBy, like_by_username, action) => {

    let sql;
    let options;
    let likeIdGenerated = uniqid();
    return new Promise((resolve, reject) => {
        if (action === "insert") {
            //console.log("like insert section")
            sql = `INSERT into ASSET_WINSTORY_LIKES values(:LIKE_ID,:WINSTORY_ID,:LIKE_BY,:LIKE_CREATED,:LIKE_USERNAME)`;
            options = [likeIdGenerated, assetid, likeBy, new Date(), like_by_username]
        }
        else {
            //console.log("in like unlike section")
            sql = `DELETE from ASSET_WINSTORY_LIKES WHERE  LIKE_BY=:LIKE_BY and WINSTORY_ID=:WINSTORY_ID`;
            options = [likeBy, assetid]
        }

        const connection = getDb();
        connection.execute(sql, options,
            {
                outFormat: oracledb.Object,
                autoCommit: true
            })
            .then(res => {
                if (action === 'insert') {
                    resolve({ "like_id": likeIdGenerated })
                }
                else {
                    resolve({ "status": "like " + action + " successfully" })
                }
            })
            .catch(err => {
                //console.log(err)
            })
    })

}
exports.getSocialDataByWinStoryID = (host, assetId, userId) => {
    let assetSocialObj = {}
    return new Promise((resolve, reject) => {
        getCommentsById(host, assetId)
            .then(comments => {
                assetSocialObj.COMMENTS = comments;
                getLikesByAssetId(assetId)
                    .then(likes => {
                        assetSocialObj.LIKES = likes
                        getLikesByAssetIdAndUserId(assetId, userId)
                            .then(userLike => {
                                assetSocialObj.USER_LIKE = userLike;
                                resolve(assetSocialObj)
                            })
                    })
            })
    })
}
const getCommentsById = (host, assetId) => {
    const connection = getDb();
    return connection.query(`select COMMENT_ID,
    COMMENT_COMMENT,
    COMMENTBY,
    COMMENTON,
    WINSTORY_ID,
    COMMENT_USERNAME,
    case when USER_PROFILE_IMAGE is null then null
    else :0||USER_PROFILE_IMAGE
    end  USER_PROFILE_IMAGE
    from ASSET_WINSTORY_COMMENTS c  full outer join asset_user u on (c.commentby=u.user_email)where WINSTORY_ID=:ASSET_ID`,
        ["http://" + host + "/", assetId],
        {
            outFormat: oracledb.OBJECT
        })
}
const getLikesByAssetId = (assetId) => {
    const connection = getDb();
    return connection.query(`select
    LIKE_ID,
    WINSTORY_ID,
    LIKE_BY,
    LIKE_CREATED,
    LIKE_USERNAME ,
    case when USER_PROFILE_IMAGE is null then null
    else 'http://129.213.212.175:8001/'||USER_PROFILE_IMAGE
    end  USER_PROFILE_IMAGE
    from ASSET_WINSTORY_LIKES l  full outer join asset_user u on (l.like_by=u.user_email)where WINSTORY_ID=:ASSET_ID`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}


const getLikesByAssetIdAndUserId = (assetId, userId) => {
    const connection = getDb();
    return connection.query(`select * from ASSET_WINSTORY_LIKES where WINSTORY_ID=:ASSET_ID and LIKE_BY=:LIKE_BY`, [assetId, userId],
        {
            outFormat: oracledb.OBJECT
        })
}

exports.deleteWinsStoryById = (winstoryId) => {
    return new Promise((resolve, reject) => {
        const connection = getDb();
        connection.execute(`DELETE from ASSET_WINSTORY_DETAILS WHERE WINSTORY_ID=:WINSTORY_ID`, [winstoryId],
            {
                autoCommit: true,
                outFormat: oracledb.Object
            })
            .then(res => {
                connection.execute(`DELETE from ASSET_WINSTORY_COMMENTS WHERE WINSTORY_ID=:WINSTORY_ID`, [winstoryId],
                    {
                        autoCommit: true,
                        outFormat: oracledb.Object
                    })
                    .then(res => {
                        connection.execute(`DELETE from ASSET_WINSTORY_LIKES WHERE WINSTORY_ID=:WINSTORY_ID`, [winstoryId],
                            {
                                autoCommit: true,
                                outFormat: oracledb.Object
                            })
                            .then(res => {
                                connection.execute(`DELETE from ASSET_WINSTORY_FILTER_WINSTORY_MAP WHERE WINSTORY_ID=:WINSTORY_ID`, [winstoryId],
                                    {
                                        autoCommit: true,
                                        outFormat: oracledb.Object
                                    })
                                    .then(res => {
                                        resolve("Wins deleted successfully")
                                    })
                            })
                    })
            })
    })
}
exports.SEAssistance = (request, res) => {
    const connection = getDb();
    let saveDemoRequestSql = `insert into ASSET_SE_ASSISTANCE (
        REQUESTOR_NAME,
        REQUEST_MOBILE,
        REQUEST_LOCATION,
        REQUEST_PILLAR,
        WINSTORY_ID,
        USER_EMAIL,
        SE_ASSISTANCE_DATE,
        REQUEST_OPPORTUNITY_ID,
        SE_ASSISTANCE_NOTE,
        SE_ASSISTANCE_CUSTOMER_NAME) values(:0,:1,:2,:3,:4,:5,:6,:7,:8,:9)`;
    let saveDemoRequestOptions = [
        request.name,
        request.mobile,
        request.location,
        request.pillar,
        request.winstoryid,
        request.email,
        request.se_assistance_date,
        request.request_opportunity_id,
        request.se_assistance_note,
        request.se_assistance_customer_name];

    connection.execute(saveDemoRequestSql, saveDemoRequestOptions, {
        autoCommit: true
    }).then(result => {
        if (result.rowsAffected === 0) {
            console.log("Could not capture demo request. . .");
            res.status(404).json({ status: "failed", msg: "Could not SE Assistance request " });
        } else {
            console.log("Demo request is captured. . .");
            emailnotification.triggerEmailNotificationforSEAssistance(request);
            res.json({ status: "success", msg: "Assistance request saved and email notification sent successfully" })
        }

    }).catch(err => {
        console.log("Error occurred while saving SE Assistance request : " + JSON.stringify(err));
        res.status(500).json({ status: "failed", msg: JSON.stringify(err) })
    })

}