const Governance = require('../models/governance-model');
const email = require('../models/email-notification');
const getDb = require('../database/db').getDb;
const userController = require('../controllers/user-controller');
const oracledb = require('oracledb');
const axios = require('axios');


exports.getAssets = (req, res) => {
    const user_email = req.params.user_email;
    const user_roles = req.params.user_roles.toLowerCase();
    Governance.fetchAssets(user_email, user_roles, req.headers.host,)
        .then(result => {
            res.json(result)
        })
        .catch(err => {
            res.json(err)
        })
}


exports.addAssetReviewNote = (req, res) => {
    const review_note = req.body.review_note;
    let asset_status = req.body.asset_status;
    const asset_status_lvl = req.body.asset_status_lvl;
    const assetId = req.body.assetId;
    const host = req.headers.host;
    const email = req.headers.user_email;
    let asset = {};
    console.log(req.body)
    console.log("Host: " + host);

    if (asset_status_lvl === 2 && asset_status === 'Live') {
        asset_status = 'Pending Review';

    }
    asset.status = asset_status;
    asset.activityByUser = email;
    asset.approvalLevel = asset_status_lvl;
    asset.reviewNote = review_note;
    asset.host = host;
    asset.id = assetId;
    if (!review_note || !asset_status) {
        res.json({ "status": "Enter a review note" })
    }
    else {
        console.log("-----------------------------------------");
        console.log("### Capturing activity for governance ###");
        Governance.postAssetReviewNote(review_note, asset_status_lvl, asset_status, assetId, host)
            .then(result => {
                Governance.captureGovernanceActivity(JSON.stringify(review_note), email, asset_status, asset_status_lvl, assetId)
                    .then((status) => {
                        console.log(status + ": Governance activity captured for " + assetId);
                    }).catch((error) => {
                        console.log(error);
                    })
                console.log("Review submitted. . .");
                if (asset_status === 'Live') {

                    // sendEmailForAssetStatusChange(assetId, 'live');
                    getAssetDetailsAndOwnerDetails(asset);
                    res.json({ "status": "The asset has been approved successfully." });
                }
                else if (asset_status === 'Pending Rectification') {
                    getAssetDetailsAndOwnerDetails(asset);
                    res.json({ "status": "The asset has been sent for rectification with your valuable inputs." })
                    // sendEmailForAssetStatusChange(assetId, 'rectification');
                }
                else if (asset_status === 'Reject') {
                    getAssetDetailsAndOwnerDetails(asset);
                    res.json({ "status": "The asset has been rejected." })
                    // sendEmailForAssetStatusChange(assetId, 'rejected');

                } else if (asset_status === 'Pending Review') {
                    getAssetDetailsAndOwnerDetails(asset);
                    res.json({ "status": "The asset has been submitted for governance review." })
                    // sendEmailForAssetStatusChange(assetId, 'review');

                }
            })
            .catch(err => {
                console.log("postAssetReviewNote . . . error");
                res.json(err)
            })
    }
}


const getAssetDetailsAndOwnerDetails = (asset) => {
    console.log("generating notification. . . " + JSON.stringify(asset));
    let sql = '';
    const connection = getDb();
    /**
     * When approvalLevel 1 send notification to the asset owner and manager
     * When approvalLevel 0/2 send notification to the asset owner,their manager and reviewer
     */

    sql = `select a.asset_title,a.asset_id,b.user_email,b.user_manager_email 
        from asset_details a,asset_user b 
        where a.asset_owner=b.user_email and a.asset_id=:0`;

    connection.execute(sql, [asset.id], {
        outFormat: oracledb.OBJECT
    }).then(data => {

        console.log(JSON.stringify(data.rows));

        let assetowner = data.rows[0].USER_EMAIL;
        let receipients = `${assetowner},${data.rows[0].USER_MANAGER_EMAIL}`;

        //create email OBJECT
        let notification = {
            to: receipients,
            id: asset.id,
            assetstatus: asset.status,
            approvallevel: asset.approvalLevel,
            host: asset.host
        };
        console.log("------------  Notification Prep ------------  " + asset.approvalLevel != '1');
        console.log("Notificiation Object " + JSON.stringify(notification));
        if (asset.approvalLevel === '1') {
            sql = `select user_email from asset_user where user_role like '%reviewer%'`;
            connection.execute(sql, {}, {
                outFormat: oracledb.OBJECT
            }).then(data => {
                // console.log(JSON.stringify(data.rows));
                let reviewers = `${assetowner}`;
                data.rows.filter(element => {

                    reviewers += "," + element.USER_EMAIL;
                });
                // console.log(reviewers);
                notification.to = reviewers;
                try {
                    email.initiateAssetStatusEmail(notification);
                } catch (err) {
                    console.log(JSON.stringify(err));
                }

            })
        } else {
            try {

                email.initiateAssetStatusEmail(notification);
            } catch (err) {
                console.log(JSON.stringify(err));
            }
        }
    })
}

const getresp = () => {
    console.log("Testing response");
}


const sendEmailForAssetStatusChange = (assetId, status) => {
    let reviewNoteHtml = `<table border=1> 
                            <tr>
                            <th>SECTION </th>
                            <th>REVIEW NOTE </th>
                            </tr>`;
    let asset_reviewer;
    let asset_owners, asset_owners_managers, owners_managers_combined_list, asset_owners_name;
    getReviewerAndAssetDetails(assetId)
        .then(result => {

            if (result.rows.length > 0) {
                asset_reviewer_name = result.rows.map(reviewer => reviewer.USER_NAME);
                asset_reviewer_name = asset_reviewer_name.join(',');
            }
            else if (result.rows[0] != undefined) {
                asset_reviewer_name = result.rows[0].USER_NAME;
            } else {
                console.log("no reviewer found to notify");
                return;
            }
            const review_comment = JSON.parse(result.rows[0].ASSET_REVIEW_NOTE);
            if (review_comment.length > 0) {
                review_comment.forEach(rc => {
                    reviewNoteHtml += `
               
                <tr>
                    <td> ${rc.section} </td>
                    <td> ${rc.note} </td>
                </tr> `
                })
                reviewNoteHtml += `</table>`
                console.log(reviewNoteHtml)
            }
            else {
                reviewNoteHtml += `<table border=1 style="padding:5px">
                                <tr>
                                    <th>SECTION </th>
                                    <th>REVIEW NOTE </th>
                                </tr>
                                <tr>
                                    <td> ${review_comment[0].section} </td>
                                    <td> ${review_comment[0].note} </td>
                                </tr>
                            </table>`
            }
            return reviewNoteHtml;
        })
        .then(result => {
            getOwnerEmails(assetId)
                .then(result => {
                    if (result.rows.length > 0) {
                        asset_owners = result.rows.map(o => o.USER_EMAIL)
                        asset_owners = asset_owners.join(';')
                        asset_owners_name = result.rows.map(o => o.USER_NAME)
                        asset_owners_name = asset_owners_name.join(';')
                    }
                    else if (result.rows[0] != undefined) {
                        asset_owners = result.rows[0].USER_EMAIL;
                        asset_owners_name = result.rows[0].USER_NAME
                    } else {
                        console.log("no reviewer found to notify");
                        return;
                    }
                    return asset_owners;
                })
                .then(result => {
                    getOwnerManagerEmail(assetId)
                        .then(result => {
                            console.log(result)

                            if (result.rows.length > 1) {
                                asset_owners_managers = result.rows.map(o => o.USER_MANAGER_EMAIL)
                                asset_owners_managers = asset_owners_managers.join(';')
                            }
                            else if (result.rows.length === 1) {
                                asset_owners_managers = result.rows[0].USER_MANAGER_EMAIL;
                            }
                            else {
                                asset_owners_managers = '';
                            }

                            return asset_owners_managers;
                        })
                        .then(result => {
                            axios.post('https://apex.oracle.com/pls/apex/ldap_info/asset/sendemailonrectification/sendrectificationmail', {
                                asset_reviewer_name: asset_reviewer_name,
                                asset_comments: reviewNoteHtml,
                                asset_owners_mail: asset_owners,
                                asset_owners_name: asset_owners_name,
                                asset_managers: asset_owners_managers,
                                status: status
                            })
                                .then(response => {
                                    console.log(response)
                                })
                        })
                })
        })

}


const getReviewerAndAssetDetails = (assetId) => {
    const connection = getDb();
    let rectificationReviewerAndAssetDetailsSql = `select  user_email,user_name,asset_title,ASSET_DESCRIPTION,ASSET_REVIEW_NOTE from asset_user ,asset_details where user_role='reviewer' and asset_id=:0 and user_location in(
        select user_location from asset_user where user_email in 
        (select distinct regexp_substr(asset_owner,'[^,]+', 1, level) from (select asset_owner from asset_details where asset_id=:0)  where asset_id=:0
        connect by regexp_substr(asset_owner, '[^,]+', 1, level) is not null) and user_location is not null) `;
    let rectificationReviewerAndAssetDetailsOptions = [];
    rectificationReviewerAndAssetDetailsOptions.push(assetId);
    return connection.execute(rectificationReviewerAndAssetDetailsSql, rectificationReviewerAndAssetDetailsOptions, {
        outFormat: oracledb.OBJECT
    })
}

const getOwnerManagerEmail = (assetId) => {
    const connection = getDb();
    let getOwnerManagerSql = `select distinct user_manager_email from asset_user where user_manager_email is not null and user_email in
    (select distinct regexp_substr(asset_owner,'[^,]+', 1, level) from (select asset_owner from asset_details where asset_id=:0)  where asset_id=:0
    connect by regexp_substr(asset_owner, '[^,]+', 1, level) is not null)`;
    let getOwnerManagerOptions = [];
    getOwnerManagerOptions.push(assetId);
    return connection.execute(getOwnerManagerSql, getOwnerManagerOptions, {
        outFormat: oracledb.OBJECT
    })

}

const getOwnerEmails = (assetId) => {
    const connection = getDb();
    let rectificationAssetOwnerSql = `    select user_name,user_email from asset_user where user_email in(
    select regexp_substr(asset_owner,'[^,]+', 1, level) from (select asset_owner from asset_details where asset_id=:0)
    connect by regexp_substr(asset_owner, '[^,]+', 1, level) is not null)`;
    let rectificationAssetOwnerOptions = [];
    rectificationAssetOwnerOptions.push(assetId);
    return connection.execute(rectificationAssetOwnerSql, rectificationAssetOwnerOptions, {
        outFormat: oracledb.OBJECT
    })
}