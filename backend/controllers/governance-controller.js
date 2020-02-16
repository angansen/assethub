const Governance = require('../models/governance-model');
const getDb = require('../database/db').getDb;
const userController= require('../controllers/user-controller');
const oracledb = require('oracledb');
const axios = require('axios');


exports.getAssets = (req, res) => {
    const user_email = req.params.user_email;
    Governance.fetchAssets(user_email, req.headers.host)
        .then(result => {
            res.json(result)
        })
        .catch(err => {
            res.json(err)
        })
}


exports.addAssetReviewNote = (req, res) => {
    const review_note = req.body.review_note;
    const asset_status = req.body.asset_status;
    const assetId = req.body.assetId;
    const host=req.headers.host;
    console.log(req.body)
    console.log("Host: "+host);
    if (!review_note || !asset_status) {
        res.json({ "status": "Enter a review note" })
    }
    else {
        Governance.postAssetReviewNote(review_note, asset_status, assetId,host)
            .then(result => {
                console.log("Review submitted. . .");
                if (asset_status === 'Live') {
                    console.log("generating notification. . .");
                    // generateNotification(assetId);
                    res.json({ "status": "The asset has been approved successfully." });
                }
                else if (asset_status === 'Pending Rectification') {
                    // sendEmailForRectification(assetId);
                    res.json({ "status": "The asset has been sent for rectification with your valuable inputs." })
                    sendEmailForAssetStatusChange(assetId, 'rectification');
                }
                else if (asset_status === 'Reject') {
                    res.json({ "status": "The asset has been rejected." })
                    sendEmailForAssetStatusChange(assetId, 'rejected');

                }
            })
            .catch(err => {
                console.log("postAssetReviewNote . . . error");
                res.json(err)
            })
    }
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