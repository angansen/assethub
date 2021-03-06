const getDb = require('../database/db').getDb;
let fs = require('fs');
let uniqid = require('uniqid');
const oracledb = require('oracledb');
oracledb.fetchAsString = [oracledb.CLOB];
let log = require('log4js').getLogger("user-model");
let path = require('path');
let base64 = require('base-64');
const axios = require('axios');


exports.initiateAssetStatusEmail = (notification) => {
    //     console.log('----------- EMAIL NOTIFICATION ---------');
    //     console.log(JSON.stringify(notification));
    //     let emailbody = '';
    //     let subject = `Asset ID ${notification.id}  `;
    //     if (notification.assetstatus === 'Live') {
    //         emailbody = `Asset id ${notification.id} `;
    //         emailbody+=" Please click to view the asset https://"+notification.host+`/details/?${notification.id}&MyASSET=Y`;

    //         if (notification.approvallevel === '2') {
    //             emailbody += ` has been submitted for governance review`;
    //             subject += ` submitted for governance review`;
    //         } else if (notification.approvallevel === '0') {
    //             emailbody += ` has been approved after careful governance review`;
    //             subject += ` has been approved after careful review.`;
    //         }
    //     }
    //     else if (notification.assetstatus === 'Pending Rectification') {
    //         emailbody = `Asset id ${notification.id} sent for rectification with valuable review inputs.`;
    //         emailbody+=" Please click to view the asset https://"+notification.host+`/details/?${notification.id}&MyASSET=Y`;
    //         if (notification.approvallevel === '1') {
    //             subject += ` has been sent for rectification during manager review`;
    //         } else if (notification.approvallevel === '2') {
    //             subject += ` has been sent for rectification during governance review`;
    //         }
    //     }
    //     else if (notification.assetstatus === 'Reject') {
    //         emailbody = `Asset id ${notification.id} has been rejected after careful evaluation.`;
    //         if (notification.approvallevel === '1') {
    //             subject += ` has been rejected during manager review`;
    //         } else if (notification.approvallevel === '2') {
    //             subject += ` has been rejected during governance review`;
    //         }

    //     } else if (notification.assetstatus === 'Pending Review') {
    //         emailbody = `Asset id ${notification.id} has been submitted for governance review.`;
    //         emailbody+=" Please click to view the asset https://"+notification.host+`/details/?${notification.id}&Governance=Y`;
    //         if (notification.approvallevel === '1') {
    //             subject += ` has been submitted for manager review`;
    //         } else if (notification.approvallevel === '2') {
    //             subject += ` has been submitted for governance review`;
    //         }
    //     }

    //     // emailbody+=" Please click to view the asset "+notification.host+`/details/?${notification.id}&Governance=Y`;

    //     console.log("Initiating email notification despatch . . .");
    //     axios.put('https://apex.oracle.com/pls/apex/assethub/email/despatch', {
    //         "from": 'angan.sen@oracle.com',
    //         "to": notification.to,
    //         "emailbody": emailbody,
    //         "subj": subject
    //     }).then(res => {
    //         console.log('Email despatched successfully!');
    //     }).catch(err => {
    //         console.log('Email despatched Failed > "'+JSON.stringify(err));
    //     })

    // }


    console.log('----------- EMAIL NOTIFICATION ---------');
    console.log(JSON.stringify(notification));

    console.log("Initiating email notification despatch . . .");
    // https://apex.oracle.com/pls/apex/assethub/email/despatch
    // https://itfcuqba1dqacqh-db202104091443.adb.us-ashburn-1.oraclecloudapps.com/ords/assethub/api/despatch
    axios.put('https://apex.oracle.com/pls/apex/assethub/email/despatch', {
        "from": 'angan.sen@oracle.com',
        "to": notification.to,
        "emailbody": notification.body,
        "subj": notification.subject
    }).then(res => {
        console.log('Email despatched successfully!');
    }).catch(err => {
        let msg=JSON.stringify(err).includes('555')?" Maximum email per email despatch is reached per workspace":JSON.stringify(err);
        console.log('Email despatched Failed  "' + msg);
    })

}

exports.triggerEmailNotificationforRequestDemo = (request) => {
    var body = `Q&D Team,
    <br/><br/>There is a request for demo on asset ${request.asset_name} by user ${request.name}.
    <br/><br/>Provided below are the details:    
    <br/>Asset ID: ${request.assetid}
    <br/>Requester Email: ${request.email}
    <br/>Requester Name: ${request.name}
    <br/>Contact No:  ${request.mobile ? request.mobile : 'N/A'}
    <br/>Location: ${request.location ? request.location : 'N/A'}
    <br/>Pillar: ${request.pillar ? request.pillar : 'N/A'}
    <br/>Opp ID: ${request.request_opportunity_id} 
    <br/>Customer Name: ${request.request_demo_customer_name ? request.request_demo_customer_name : 'N/A'}
    <br/>Demo Date: ${request.request_demo_date ? request.request_demo_date : 'N/A'} 
    <br/>Notes: ${request.request_demo_note ? request.request_demo_note : 'N/A'} 
    <br/><br/>Please process this request and engage the appropriate team to help qualify and support this request.    
    <br/><br/>Dear ${request.name},
    <br/><br/>Your request will be processed as soon as possible and you will be contacted with next steps.
    <br/><br/>Please note: This is a system generated message. Please do not respond to this mail.`
    //console.log(body);
    return new Promise((resolve, reject) => {
        axios.put('https://apex.oracle.com/pls/apex/ldap_info/get/send_email', {
            "from_email": request.email,
            "to_email": `veronica.t.taing@oracle.com,jack.kingsley@oracle.com,samdani.shaik@oracle.com,qualification-dispatch_in_grp@oracle.com,${request.asset_owner},${request.email}`,
            "body1": body,
            "body_html": body,
            "subject": `Request for demo on asset ${request.asset_name} with asset ID ${request.assetid}`
        }).then(res => {
            console.log('Email Sent');
            resolve('Email Sent')
        })
    });
}
exports.triggerEmailNotificationforSEAssistance = (request) => {
    var body = `Q&D Team,
    <br/><br/>There is a request for SE Assistance on win ${request.winstory_name} by user ${request.name}.
    <br/><br/>Provided below are the details:    
    <br/>Win ID: ${request.winstoryid}
    <br/>Requester Email: ${request.email}
    <br/>Requester Name: ${request.name}
    <br/>Contact No:  ${request.mobile ? request.mobile : 'N/A'}
    <br/>Location: ${request.location ? request.location : 'N/A'}
    <br/>Pillar: ${request.pillar ? request.pillar : 'N/A'}
    <br/>Opp ID: ${request.request_opportunity_id} 
    <br/>Customer Name: ${request.se_assistance_customer_name ? request.se_assistance_customer_name : 'N/A'}
    <br/>Demo Date: ${request.se_assistance_date ? request.se_assistance_date : 'N/A'} 
    <br/>Notes: ${request.se_assistance_note ? request.se_assistance_note : 'N/A'} 
    <br/><br/>Please process this request and engage the appropriate team to help qualify and support this request.    
    <br/><br/>Dear ${request.name},
    <br/><br/>Your request will be processed as soon as possible and you will be contacted with next steps.
    <br/><br/>Please note: This is a system generated message. Please do not respond to this mail.`
    //console.log(body);

    let headerdata = {
        "mail_to": `veronica.t.taing@oracle.com,samdani.shaik@oracle.com,jack.kingsley@oracle.com,qualification-dispatch_in_grp@oracle.com,${request.WINSTORY_CREATED_BY},${request.email}`,
        "mail_subj": `Request for SE Assistance on win ${request.winstory_name} with Win ID ${request.winstoryid}`
    };
    return new Promise((resolve, reject) => {
        // axios.put('https://apex.oracle.com/pls/apex/ldap_info/get/send_email', {
        //     "from_email": request.email,
        //     "to_email": `veronica.t.taing@oracle.com,samdani.shaik@oracle.com,jack.kingsley@oracle.com,qualification-dispatch_in_grp@oracle.com,${request.WINSTORY_CREATED_BY},${request.email}`,
        //     "body1": body,
        //     "body_html": body,
        //     "subject": `Request for SE Assistance on win ${request.winstory_name} with Win ID ${request.winstoryid}`
        // }).then(res => {
        //     console.log('Email Sent');
        //     resolve('Email Sent')
        // })

        axios.put('https://apex.oracle.com/pls/apex/ldap_info/get/send_email', body, {
            headers: headerdata
        }).then(res => {
            console.log('Email Sent');
            resolve('Email Sent')
        })
    });
}
exports.triggerEmailNotificationforFeedback = (request) => {
    console.log(JSON.stringify(request));
    var body = `Hi,
    <br/><br/>There is a Feedback on asset ${request.assetId} by user ${request.commentByUserName}.
    <br/><br/> Provided below are the details:
    <br/>Asset ID: ${request.assetId} 
    <br/>Feedback Provided By: ${request.commentBy}
    <br/>Feedback: ${request.comment}
    <br/><br/>Please note: This is a system generated message. Please do not respond to this mail.`

    let reqbody = {
        "from_email": request.commentBy,
        "to_email": request.asset_owner,
        "body1": body,
        "body_html": body,
        "subject": `Feedback on asset ${request.assetId} with asset ID ${request.assetId}`
    }
    let headerdata = {
        "mail_to": request.asset_owner,
        "mail_subj": `Feedback on asset ${request.assetId} with asset ID ${request.assetId}`
    };
    // console.log(" RE BODY : -> " + JSON.stringify(reqbody));
    return new Promise((resolve, reject) => {
        // axios.put('https://apex.oracle.com/pls/apex/ldap_info/get/send_email', reqbody).then(res => {
        //     console.log('Feedback email Sent');
        //     resolve('Feedback email Sent');
        // })
        axios.put('https://apex.oracle.com/pls/apex/ldap_info/get/send_email', body, {
            headers: headerdata
        }).then(res => {
            console.log('Feedback email Sent');
            resolve('Feedback email Sent');
        })
    });
}

exports.notificationForWinStoryComment = (request) => {
    console.log(JSON.stringify(request));
    //WINSTORY_CUSTOMER_NAME, WINSTORY_FISCAL_QUARTER
    var body = `Hi,
    <br/><br/>There is a comment on the win ${request.winstoryId} by user ${request.commentByUserName}.
    <br/><br/> Provided below are the details:
    <br/>Customer Name : ${request.winstory_customer_name} 
    <br/>Win Fiscal Quarter: ${request.winstory_fiscal_quarter}
    <br/>Commented By: ${request.commentBy} 
    <br/>Comment: ${request.comment} 
    <br/><br/>Please note: This is a system generated message. Please do not respond to this mail.`

    let reqbody = {
        "from_email": request.commentBy,
        "to_email": 'NACLOUDWINS_US@ORACLE.COM',
        "body1": body,
        "body_html": body,
        "subject": `Comment on win id ${request.winstoryId}`
    }
    let headerdata = {
        "mail_to": request.asset_owner,
        "mail_subj": `Feedback on asset ${request.assetId} with asset ID ${request.assetId}`
    };
    console.log(JSON.stringify(reqbody));
    return new Promise((resolve, reject) => {
        // axios.put('https://apex.oracle.com/pls/apex/ldap_info/get/send_email', reqbody).then(res => {
        //     console.log('Winstory comment email Sent ');
        //     resolve('Winstory comment email Sent');
        // })
        axios.put('https://apex.oracle.com/pls/apex/ldap_info/get/send_email', body, {
            headers: headerdata
        }).then(res => {
            console.log('Winstory comment email Sent');
            resolve('Winstory comment email Sent');
        })
    });
}