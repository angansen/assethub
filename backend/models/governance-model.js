const getDb = require('../database/db').getDb;
var uniqid = require('uniqid');
const usermodel = require('../models/user-model');
const oracledb = require('oracledb');

exports.fetchAssets = (user_email, user_role, request) => {
    console.log("Inside fetch asset");
    const connection = getDb();
    let filteredAssets = [];
    let reports_emails = '';
    return new Promise((resolve, reject) => {

        // Get the list of reporting user and then matching with the asset' owner
        let checkForReviewerSql = `select user_email from ASSET_USER where user_manager_email=:USER_EMAIL`;
        let checkForReviewerOptions = [user_email];
        connection.query(checkForReviewerSql, checkForReviewerOptions,
            {
                outFormat: oracledb.OBJECT
            }).then(result => {
                console.log(JSON.stringify(result));
                result.forEach(element => {
                    // reports_emails += element.USER_EMAIL + '\',\'';
                    if (reports_emails.length > 0) {
                        reports_emails += '\',\'' + element.USER_EMAIL
                    } else reports_emails += element.USER_EMAIL;
                })
                console.log(user_role + ' - ' + reports_emails);
                let fetchPendingReviewAssetsSql = `select a.ASSET_ID,a.ASSET_DESCRIPTION,a.ASSET_CUSTOMER,a.ASSET_CREATEDBY,
                a.ASSET_CREATED_DATE,a.ASSET_SERVICE_ID,a.ASSET_THUMBNAIL,a.ASSET_MODIFIED_DATE,a.ASSET_MODIFIED_BY,
                a.ASSET_EXPIRY_DATE,a.ASSET_VIDEO_LINK,a.ASSET_OWNER,a.ASSET_STATUS,
                a.ASSET_REVIEW_NOTE,a.ASSET_APPROVAL_LVL,c.checklist_items,d.filter_name as ASSET_TYPE,d.filter_id as ASSET_TYPE_ID
                 from asset_details a, asset_filter_asset_map b,asset_governance_checkpoint_by_type c,asset_tags d 
                where asset_status in ('Live','Pending Review','Reject','Pending Rectification')
                and a.asset_id=b.asset_id and b.filter_id=c.asset_type_id and 
                b.filter_id=d.filter_id and d.filter_id in (select filter_id from asset_tags where filter_parent_id in (select filter_id 
                    from asset_tags where filter_parent_id='goek85ttc43'))`;

                if (user_role.includes('reviewer')) {
                    let emails = user_email +"','"+ reports_emails;
                    console.log(emails);
                    fetchPendingReviewAssetsSql += ` and asset_owner in('` + emails + `') and asset_approval_lvl in(1,2)`;
                } else {
                    fetchPendingReviewAssetsSql += ` and asset_owner in ('` + reports_emails + `') and asset_approval_lvl=1`;
                }

                fetchPendingReviewAssetsSql += ` order by asset_modified_date desc`;

                console.log(fetchPendingReviewAssetsSql);

                connection.query(fetchPendingReviewAssetsSql, {},
                    {
                        outFormat: oracledb.OBJECT
                    }).then(result => {
                        result.forEach(element => {
                            // element.checklist_items=JSON.parse(element.checklist_items);
                            if (element.ASSET_REVIEW_NOTE == null) {
                                element.ASSET_APPROVAL_LVL = 1;
                                element.ASSET_REVIEW_NOTE = JSON.stringify({
                                    note: "",
                                    questions: []
                                })

                                // element.ASSET_REVIEW_NOTE=JSON.stringify(element.ASSET_REVIEW_NOTE);
                            }
                        });
                        console.log(result.length);
                        resolve(formatAssetByStatus(result, request));
                    })



            }).catch(err => {
                reject(err + "Something went Wrong.We'll be back soon")
            })
    })
}

formatAssetByStatus = (result, request) => {
    let pendingReviewList = [];

    let pendingRectificationList = [];

    let rejectList = [];

    let liveList = [];


    let assetlist = [{
        status: "Pending Review",
        list: pendingReviewList
    }, {
        status: "Pending Rectification",
        list: pendingRectificationList
    }, {
        status: "Reject",
        list: rejectList
    }, {
        status: "Live",
        list: liveList
    }];

    result.map(asset => {
        asset.ASSET_THUMBNAIL = getimagepath(request) + asset.ASSET_THUMBNAIL;
        if (asset.ASSET_STATUS == 'Pending Review') {
            pendingReviewList.push(asset);
        } else if (asset.ASSET_STATUS == 'Pending Rectification') {
            pendingRectificationList.push(asset);
        } else if (asset.ASSET_STATUS == 'Reject') {
            rejectList.push(asset);
        } else if (asset.ASSET_STATUS == 'Live') {
            liveList.push(asset);
        }
    })

    return assetlist;
}

getimagepath = (request) => {
    return (request.headers.host.toLowerCase().includes(':') ? 'http://' + request.headers.host + "/" : 'https://' + request.headers.host + "/image/");
}

exports.captureGovernanceActivity = (review_note, activity_user, asset_status, asset_status_lvl, assetId) => {
    const connection = getDb();
    return new Promise((resolve, reject) => {
        let createGovActivitySQL = `insert into ASSET_GOVERNANCE_ACTIVITY (ASSET_ID,ACTIVITY_REVIEW_NOTE,ACTIVITY_BY,ASSET_STATUS,ASSET_STATUS_LVL) values(:ASSET_ID,:ACTIVITY_REVIEW_NOTE,:ACTIVITY_BY,:ASSET_STATUS,:ASSET_STATUS_LVL)`
        let sqlValues = [assetId, review_note, activity_user, asset_status, asset_status_lvl];

        connection.execute(createGovActivitySQL, sqlValues, {
            outFormat: oracledb.OBJECT,
            autoCommit: true
        }).then(result => {

            resolve("success")
        }).catch(err => {
            reject("failure: " + err);
        })
    })

}

exports.postAssetReviewNote = (review_note, asset_status_lvl, asset_status, assetId, host) => {
    const connection = getDb();
    review_note = JSON.stringify(review_note);
    if (asset_status == 'Live') {
        usermodel.preparenotification(assetId, "Asset", host);
    }

    let insertReviewNoteSql = `UPDATE ASSET_DETAILS SET ASSET_REVIEW_NOTE = :ASSET_REVIEW_NOTE,
    ASSET_STATUS=:ASSET_STATUS,ASSET_APPROVAL_LVL=:ASSET_APPROVAL_LVL where ASSET_ID=:ASSET_ID`;
    let insertReviewNoteOptions = [review_note, asset_status, asset_status_lvl, assetId]


    return new Promise((resolve, reject) => {
        connection.execute(insertReviewNoteSql, insertReviewNoteOptions,
            {
                outFormat: oracledb.OBJECT,
                autoCommit: true
            })
            .then(result => {

                console.log("posted and state: " + asset.ASSET_STATUS);

                resolve(result)
            })
            .catch(err => {
                resolve({})
            })
    })

}