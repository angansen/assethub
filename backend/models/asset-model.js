const getDb = require('../database/db').getDb;
const doRelease = require('../database/db').getDb;
const worker = require('../utility/worker');
const usermodel = require('../models/user-model');
var uniqid = require('uniqid');
const oracledb = require('oracledb');
const path = require('path');
const emailnotification = require('./email-notification');
let stringSimilarity = require('string-similarity');
const fs = require('fs');
const cluster = require('express-cluster');
const governance = require('../models/governance-model');
let sw = require('stopword');

const generateFileName = (sampleFile, assetId, filesArray, imageDescription) => {
    let imgObject = {};
    let fname = sampleFile.name.split('.')[0];
    fname = fname.replace(/ /g, '').replace(/[^a-zA-Z0-9]/g, '');
    const ftype = sampleFile.name.split('.')[1];
    const uniqueId = uniqid();
    const finalFname = fname + uniqueId.concat('.', ftype);
    const uploadPath = path.join('/', 'mnt/ahfs/assets', assetId, finalFname);
    var content = 'assets/' + assetId + '/' + `${finalFname}`;

    //var content=`https://localhost:3002/${finalFname}`
    imgObject.IMAGE_ID = uniqueId;
    imgObject.ASSET_ID = assetId;
    imgObject.IMAGE_NAME = finalFname;
    imgObject.IMAGEURL = content;
    imgObject.IMAGE_DESCRIPTION = imageDescription;
    filesArray.push(imgObject)
    imgObject = {}

    try {
        console.log("---------  FOLDER CREATION for thumbnail ----------")
        const baseresoursePath = path.join('/', 'mnt/ahfs/assets', assetId);
        console.log("projected path " + baseresoursePath);

        fs.open(baseresoursePath, 'r', (err) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    console.log('folder does not exist');

                    if (!fs.existsSync(baseresoursePath)) {
                        fs.mkdirSync(baseresoursePath);
                        console.log("Calling file create " + uploadPath);
                        sampleFile.mv(uploadPath, function (err) {
                            if (err) {
                                return res.status(500).send(err);
                            }
                        })
                    }

                }
            } else {
                console.log("Calling file create " + uploadPath);
                sampleFile.mv(uploadPath, function (err) {
                    if (err) {
                        return res.status(500).send(err);
                    }
                })
            }
        });

    } catch (err) {
        console.log("Folder creation failed " + err.message);
    }

    return filesArray;
}



const dynamicSort = (tAssets, sortBy, order) => {

    if (sortBy && order === 'asc') {
        // //console.log("asc order")
        if (sortBy === 'ratings') {
            //  //console.log("sortBy ratings")
            tAssets.sort((a, b) => a.RATINGS.AVG_RATING > b.RATINGS.AVG_RATING ? 1 : -1);
        }
        else if (sortBy === 'createdDate') {
            tAssets.sort((a, b) => a.ASSET_CREATED_DATE > b.ASSET_CREATED_DATE ? 1 : -1);
        }
        else if (sortBy === 'likes') {
            tAssets.sort((a, b) => a.LIKES.LIKE_COUNT > b.LIKES.LIKE_COUNT ? 1 : -1);
        }
        else if (sortBy === 'views') {
            tAssets.sort((a, b) => a.VIEWS.VIEW_COUNT > b.VIEWS.VIEW_COUNT ? 1 : -1);
        }
    }
    else if (sortBy && order === 'desc') {
        if (sortBy === 'ratings') {
            tAssets.sort((a, b) => a.RATINGS.AVG_RATING < b.RATINGS.AVG_RATING ? 1 : -1);
        }
        else if (sortBy === 'createdDate') {
            tAssets.sort((a, b) => a.ASSET_CREATED_DATE < b.ASSET_CREATED_DATE ? 1 : -1);
        }
        else if (sortBy === 'likes') {
            tAssets.sort((a, b) => a.LIKES.LIKE_COUNT < b.LIKES.LIKE_COUNT ? 1 : -1);
        }
        else if (sortBy === 'views') {
            tAssets.sort((a, b) => a.VIEWS.VIEW_COUNT < b.VIEWS.VIEW_COUNT ? 1 : -1);
        }
    }
}
const getAssetsById = (assetId) => {
    const connection = getDb();
    return connection.query(`select a.*,c.checklist_items,d.filter_name as ASSET_TYPE,d.filter_id as ASSET_TYPE_ID
     from asset_details a, asset_filter_asset_map b,asset_governance_checkpoint_by_type c,asset_tags d 
    where a.asset_id=b.asset_id and b.filter_id=d.filter_id and c.asset_type_id=d.filter_id and a.ASSET_ID=:ASSET_ID`, [assetId])
}

const updateViewByAssetId = ((assetId, email) => {
    const connection = getDb();

    console.log(`Updating view for ${assetId} by ${email}`);
    return connection.insert(`insert into ASSET_VIEWS (ASSET_ID,VIEWED_BY,CLIENT_PLATFORM) values(:0,:1,:2)`, [assetId, email, 'w'],
        {
            autoCommit: true
        })

})


const getRatingsById = (assetId) => {
    const connection = getDb();
    return connection.query(`SELECT * from ASSET_RATES where ASSET_ID=:ASSET_ID`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}


const getLinksById = (assetId) => {
    const connection = getDb();
    return connection.query(`SELECT * from ASSET_LINKS  where ASSET_ID=:ASSET_ID`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}
const getPartnerById = (assetId, email) => {
    const connection = getDb();
    return connection.query(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_tags f on (m.filter_id=f.filter_id) 
    where ASSET_ID=:ASSET_ID and filter_parent_id='w78svn48y0'`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}
const getImagesById = (assetId) => {
    const connection = getDb();
    return connection.query(`SELECT * from ASSET_IMAGES where ASSET_ID=:ASSET_ID`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}

// const getCommentsById=(assetId)=>{
//     const connection=getDb();
//     return connection.query(`SELECT * from ASSET_COMMENTS where ASSET_ID=:ASSET_ID`,[assetId],
//     {
//         outFormat:oracledb.OBJECT
//     })
// }

const getCommentsById = (assetId, request) => {
    const connection = getDb();
    return connection.query(`select COMMENT_ID,
    COMMENT_COMMENT,
    COMMENTBY,
    COMMENTON,
    ASSET_ID,
    COMMENT_USERNAME,
    case when USER_PROFILE_IMAGE is null then null
    else :0||USER_PROFILE_IMAGE
    end  USER_PROFILE_IMAGE
    from asset_comments c  full outer join asset_user u on (c.commentby=u.user_email)where ASSET_ID=:1`,
        ["https://" + request.headers.host + "/", assetId],
        {
            outFormat: oracledb.OBJECT
        })
}

const getSharecountByAssetId = (assetId) => {
    const connection = getDb();
    return connection.query(`select count(*) as count from ASSET_USER_activity where activity_content_id=:0`,
        [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}


const getAssetFilterMapByIdandType = (assetId) => {
    const connection = getDb();
    return connection.query(`select m.filter_id,filter_parent_id,f.filter_name from asset_filter_asset_map m join asset_tags f on (m.filter_id=f.filter_id) where  ASSET_ID=:ASSET_ID`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}

const getNACTLOBByAssetId = (assetId) => {
    const connection = getDb();
    return connection.query(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_tags f on (m.filter_id=f.filter_id) 
    where ASSET_ID=:ASSET_ID and filter_parent_id='mhc9sit8xq'`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}

const getWorkloadCatByAssetId = (assetId) => {
    const connection = getDb();
    return connection.query(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_tags f on (m.filter_id=f.filter_id) 
    where ASSET_ID=:ASSET_ID and filter_parent_id in('kuw55eptpi','djd1dimyl7')`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}
const getCompetetionByAssetId = (assetId) => {
    const connection = getDb();
    return connection.query(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_tags f on (m.filter_id=f.filter_id) where  ASSET_ID=:ASSET_ID and filter_parent_id ='bdjk9d4f9gd'`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}
const getAssetTypeByAssetId = (assetId) => {
    const connection = getDb();
    return connection.query(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_tags f on (m.filter_id=f.filter_id) where  ASSET_ID=:ASSET_ID and filter_parent_id ='goek85ttc43'`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}

const getIndustryByAssetId = (assetId) => {
    const connection = getDb();
    return connection.query(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_tags f 
    on (m.filter_id=f.filter_id) where ASSET_ID=:ASSET_ID and filter_parent_id='2kos227ib0'`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}


const getLikesByAssetId = (request, assetId) => {
    const connection = getDb();
    return connection.query(`select
    LIKE_ID,
    ASSET_ID,
    LIKE_BY,
    LIKE_CREATED,
    LIKE_USERNAME ,
    case when USER_PROFILE_IMAGE is null then null
    else '${request.host}'||USER_PROFILE_IMAGE
    end  USER_PROFILE_IMAGE
    from asset_likes l  full outer join asset_user u on (l.like_by=u.user_email)where ASSET_ID=:ASSET_ID`, [assetId],
        {
            outFormat: oracledb.OBJECT
        })
}


const getLikesByAssetIdAndUserId = (assetId, userId) => {
    const connection = getDb();
    return connection.query(`select * from ASSET_LIKES where ASSET_ID=:ASSET_ID and LIKE_BY=:LIKE_BY`, [assetId, userId],
        {
            outFormat: oracledb.OBJECT
        })
}

module.exports = class Asset {
    constructor(assetId, description, customer, createdBy,
        createdDate, serviceid,
        thumbnail, modifiedDate, modifiedBy, filters, links, expiryDate, video_link, owner, windata) {

        this.assetId = assetId;
        this.description = description;
        this.customer = customer;
        this.createdBy = createdBy.toLowerCase();
        this.createdDate = createdDate;
        this.serviceid = serviceid;
        this.thumbnail = thumbnail;
        this.modifiedDate = modifiedDate;
        this.modifiedBy = modifiedBy;
        this.links = links;
        this.filters = filters;
        this.expiryDate = expiryDate;
        this.video_link = video_link;
        this.owner = owner.toLowerCase();
        this.windata = windata;

    }


    save(type) {

        let assetState = type;
        return new Promise((resolve, reject) => {
            var assetid = this.assetId;
            var self = this;
            const connection = getDb();
            let filterObj = {};
            let filterArr = [];
            console.log("------------------ SAVEING ASSET -----------------");
            console.log(assetState + "  TYPE  " + JSON.stringify(self));

            if (this.assetId) {

                //   //console.log("in edit mode")
                // //console.log(this.links)
                if (!this.filters) {
                    this.filters = []
                }
                if (this.filters.length > 1) {
                    this.filters.forEach(f => {
                        filterObj.FILTER_ASSET_MAP_ID = uniqid.process();
                        filterObj.FILTER_ID = f.Value;
                        filterObj.ASSET_ID = assetid;
                        filterArr.push(filterObj)
                        filterObj = {};
                    })
                }
                else if (this.filters.length === 1) {
                    filterObj.FILTER_ASSET_MAP_ID = uniqid.process();
                    filterObj.FILTER_ID = this.filters[0].Value;
                    filterObj.ASSET_ID = assetid;
                    filterArr.push(filterObj)
                }
                else {
                    filterArr = null;
                }
                const oj = this.links;
                if (!(oj === null)) {
                    oj.forEach(link => {
                        // linkObj={LINK_ID:uniqid.process(),ASSET_ID:assetid,...link}
                        // return linkObj
                        link.LINK_ID = uniqid.process();
                        link.ASSET_ID = self.assetId;
                    })
                }

                // console.log("Option SQL : " + JSON.stringify(self));
                connection.transaction([
                    function firstAction() {

                        let bindingValue = [self.description, self.customer, self.createdBy.toLowerCase(),
                        self.serviceid, new Date(), self.modifiedBy,
                        self.expiryDate, self.video_link,
                        self.owner.toLowerCase(), assetState,
                        self.windata.WIN_ECA,
                        self.windata.WIN_REGID,
                        self.windata.WIN_FISCAL_YR,
                        self.windata.WIN_MEMBERS,
                        self.windata.WIN_SOLUTION_SOLD,
                        self.windata.WIN_COSUMING_DATE,
                        self.windata.WIN_GOLIVE_ON,
                        self.windata.WIN_DEAL_CYCLE,
                        self.windata.WIN_RENEWAL,
                        self.windata.WIN_CUSTOMER_PERSONA,
                        self.windata.WIN_REF_LANG_INCL_IN_CONTRACT,
                        self.windata.WIN_BUSINESS_IMPACT,
                        self.windata.WIN_SALES_PROCESS_TEAMS,
                        self.windata.WIN_LESSONS_LEARNED,
                        self.windata.WIN_CUSTOMER_BUSINESS_CHALLANGES,
                        self.windata.WIN_TCV_ARR, self.windata.ASSET_APPROVAL_LVL, self.assetId];

                        console.log("Editing Binding : " + JSON.stringify(bindingValue));
                        return connection.execute(`UPDATE ASSET_DETAILS set 
            ASSET_DESCRIPTION=:ASSET_DESCRIPTION,
            ASSET_CUSTOMER=:ASSET_CUSTOMER,
            ASSET_CREATEDBY=:ASSET_CREATEDBY,
            ASSET_SERVICE_ID=:ASSET_SERVICE_ID,
            ASSET_MODIFIED_DATE=:ASSET_MODIFIED_DATE,
            ASSET_MODIFIED_BY=:ASSET_MODIFIED_BY,
            ASSET_EXPIRY_DATE=:ASSET_EXPIRY_DATE,
            ASSET_VIDEO_LINK=:ASSET_VIDEO_LINK,
            ASSET_OWNER=:ASSET_OWNER,
            ASSET_STATUS=:ASSET_STATUS,
            WIN_ECA=:WIN_ECA,
            WIN_REGID=:WIN_REGID,
            WIN_FISCAL_YR=:WIN_FISCAL_YR,
            WIN_MEMBERS=:WIN_MEMBERS,
            WIN_SOLUTION_SOLD=:WIN_SOLUTION_SOLD,
            WIN_COSUMING_DATE=:WIN_COSUMING_DATE,
            WIN_GOLIVE_ON=:WIN_GOLIVE_ON,
            WIN_DEAL_CYCLE=:WIN_DEAL_CYCLE,
            WIN_RENEWAL=:WIN_RENEWAL,
            WIN_CUSTOMER_PERSONA=:WIN_CUSTOMER_PERSONA,
            WIN_REF_LANG_INCL_IN_CONTRACT=:WIN_REF_LANG_INCL_IN_CONTRACT,
            WIN_BUSINESS_IMPACT=:WIN_BUSINESS_IMPACT,
            WIN_SALES_PROCESS_TEAMS=:WIN_SALES_PROCESS_TEAMS,
            WIN_LESSONS_LEARNED=:WIN_LESSONS_LEARNED,
            WIN_CUSTOMER_BUSINESS_CHALLANGES=:WIN_CUSTOMER_BUSINESS_CHALLANGES,
            WIN_TCV_ARR=:WIN_TCV_ARR,
            ASSET_APPROVAL_LVL=:ASSET_APPROVAL_LVL WHERE ASSET_ID=:ASSET_ID`,
                            bindingValue,
                            {
                                outFormat: oracledb.Object
                            }).then(res => {
                                console.log(self.assetId + ' 1st update done(Asset details updated --> ' + JSON.stringify(res))
                            })
                    }, function secondAction() {
                        if (oj.length >= 0) {
                            console.log(JSON.stringify(oj));
                            return connection.execute(`delete from ASSET_LINKS  WHERE ASSET_ID=:ASSET_ID and LINK_REPOS_TYPE!='DOCUMENT'`, [self.assetId]
                                , {
                                    autoCommit: true
                                }
                            ).then(res => {
                                console.log("Old linked clear");
                                return connection.executeMany(`INSERT into ASSET_LINKS(LINK_URL_TYPE,LINK_URL,LINK_REPOS_TYPE,LINK_DESCRIPTION,LINK_DESCRIPTION_DATA,DEPLOY_STATUS,LINK_ID,ASSET_ID,LINK_ACTIVE) values(
                                    :LINK_URL_TYPE,:LINK_URL,:LINK_REPOS_TYPE,:LINK_DESCRIPTION,:LINK_DESCRIPTION_DATA,:DEPLOY_STATUS,:LINK_ID,:ASSET_ID,'true')`,
                                    oj, {
                                    autoCommit: true
                                }).then(linkres => {
                                    console.log("2nd update Links batch succesfully executed --> " + JSON.stringify(res));
                                }).catch(err => {
                                    console.log("Links batch insert failed");
                                })
                            })
                        }
                        else {
                            return connection.query(`SELECT * from asset_links`, {})

                        }
                    }, function thirdAction() {
                        if (filterArr.length > 0) {
                            console.log(JSON.stringify(filterArr));
                            return connection.execute(`delete from ASSET_FILTER_ASSET_MAP WHERE ASSET_ID=:ASSET_ID`, [self.assetId],
                                {
                                    autoCommit: true
                                }
                            ).then(res => {
                                connection.batchInsert(`INSERT into ASSET_FILTER_ASSET_MAP values(
                            :FILTER_ASSET_MAP_ID,:FILTER_ID,:ASSET_ID)`, filterArr,
                                    {
                                        outFormat: oracledb.Object
                                    }).then(res => {
                                        console.log("3rd update filters inserted successfully")
                                    })
                            })
                        }
                        else {
                            return connection.query(`SELECT * from ASSET_FILTER_ASSET_MAP`, {})
                        }
                    }], {
                    sequence: true
                })
                    .then((output) => {
                        console.log('Update transaction executed!');
                        resolve("updated")
                    })
                    .catch(err => {
                        console.log(err)
                    })
            }
            else {
                this.assetId = uniqid.process('AH-');
                assetid = this.assetId;
                //console.log(this.assetId, self.links)
                if (!this.filters) {
                    this.filters = []
                }
                if (this.filters.length > 1) {
                    this.filters.forEach(f => {
                        filterObj.FILTER_ASSET_MAP_ID = uniqid.process();
                        filterObj.FILTER_ID = f.Value;
                        filterObj.ASSET_ID = assetid;
                        filterArr.push(filterObj)
                        filterObj = {};
                    })
                }
                else if (this.filters.length === 1) {
                    filterObj.FILTER_ASSET_MAP_ID = uniqid.process();
                    filterObj.FILTER_ID = this.filters[0].Value;
                    filterObj.ASSET_ID = assetid;
                    filterArr.push(filterObj)
                }
                else {
                    filterArr = null;
                }
                let oj = this.links;

                console.log('Filters --> ' + JSON.stringify(filterArr));
                if (!(oj === null)) {
                    oj.forEach(link => {

                        link.LINK_ID = uniqid.process();
                        link.ASSET_ID = assetid;
                    })
                }
                self.windata.WIN_RENEWAL = self.windata.WIN_RENEWAL ? "YES" : "NO";
                let bindvalue = [assetid, self.description, self.customer, self.createdBy.toLowerCase(),
                    new Date(), self.serviceid, self.thumbnail, new Date(),
                    self.modifiedBy, self.expiryDate, self.video_link, self.owner.toLowerCase(), assetState,
                    self.windata.WIN_ECA,
                    self.windata.WIN_REGID,
                    self.windata.WIN_FISCAL_YR,
                    self.windata.WIN_MEMBERS,
                    self.windata.WIN_SOLUTION_SOLD,
                    self.windata.WIN_COSUMING_DATE,
                    self.windata.WIN_GOLIVE_ON,
                    self.windata.WIN_DEAL_CYCLE,
                    self.windata.WIN_RENEWAL,
                    self.windata.WIN_CUSTOMER_PERSONA,
                    self.windata.WIN_REF_LANG_INCL_IN_CONTRACT,
                    self.windata.WIN_BUSINESS_IMPACT,
                    self.windata.WIN_SALES_PROCESS_TEAMS,
                    self.windata.WIN_LESSONS_LEARNED,
                    self.windata.WIN_CUSTOMER_BUSINESS_CHALLANGES,
                    self.windata.WIN_TCV_ARR,
                    self.windata.ASSET_APPROVAL_LVL];

                console.log("Bind Value : " + JSON.stringify(bindvalue));
                connection.transaction([
                    function firstAction() {
                        return connection.insert(`INSERT into 
                        ASSET_DETAILS(ASSET_ID,
                            ASSET_DESCRIPTION,
                ASSET_CUSTOMER,
                ASSET_CREATEDBY,
                ASSET_CREATED_DATE,
                ASSET_SERVICE_ID,
                ASSET_THUMBNAIL,
                ASSET_MODIFIED_DATE,
                ASSET_MODIFIED_BY,
                ASSET_EXPIRY_DATE,
                ASSET_VIDEO_LINK,
                ASSET_OWNER,
                ASSET_STATUS,
                WIN_ECA,
                WIN_REGID,
                WIN_FISCAL_YR,
                WIN_MEMBERS,
                WIN_SOLUTION_SOLD,
                WIN_COSUMING_DATE,
                WIN_GOLIVE_ON,
                WIN_DEAL_CYCLE,
                WIN_RENEWAL,
                WIN_CUSTOMER_PERSONA,
                WIN_REF_LANG_INCL_IN_CONTRACT,
                WIN_BUSINESS_IMPACT,
                WIN_SALES_PROCESS_TEAMS,
                WIN_LESSONS_LEARNED,
                WIN_CUSTOMER_BUSINESS_CHALLANGES,
                WIN_TCV_ARR,
                ASSET_APPROVAL_LVL) 
                values(:ASSET_ID,
                :ASSET_DESCRIPTION,
                :ASSET_CUSTOMER,
                :ASSET_CREATEDBY,
                :CREATED_DATE,
                :ASSET_SERVICE_ID,
                :ASSET_THUMBNAIL,
                :ASSET_MODIFIED_DATE,
                :ASSET_MODIFIED_BY,
                :ASSET_EXPIRY_DATE,
                :ASSET_VIDEO_LINK,
                :ASSET_OWNER,
                :ASSET_STATUS,
                :WIN_ECA,
                :WIN_REGID,
                :WIN_FISCAL_YR,
                :WIN_MEMBERS,
                :WIN_SOLUTION_SOLD,
                :WIN_COSUMING_DATE,
                :WIN_GOLIVE_ON,
                :WIN_DEAL_CYCLE,
                :WIN_RENEWAL,
                :WIN_CUSTOMER_PERSONA,
                :WIN_REF_LANG_INCL_IN_CONTRACT,
                :WIN_BUSINESS_IMPACT,
                :WIN_SALES_PROCESS_TEAMS,
                :WIN_LESSONS_LEARNED,
                :WIN_CUSTOMER_BUSINESS_CHALLANGES,
                :WIN_TCV_ARR,
                :ASSET_APPROVAL_LVL)`,
                            bindvalue,
                            {
                                outFormat: oracledb.Object
                            }).then(res => {
                                console.log('1st insert done(Asset details inserted)')
                            }).catch(err => {
                                console.log("First insert Action error " + err);
                                reject({ msg: "Asset creation failed on first step" });
                            }).finally(() => {
                                console.log("---------------------");
                                console.log("Asset details section");
                            })
                    }
                    , function secondAction() {
                        if (oj.length >= 0) {
                            console.log(JSON.stringify(oj));
                            return connection.execute(`delete from ASSET_LINKS  WHERE ASSET_ID=:ASSET_ID and LINK_REPOS_TYPE!='DOCUMENT'`, [self.assetId]
                                , {
                                    autoCommit: true
                                }
                            ).then(res => {
                                console.log("Old linked clear");
                                connection.executeMany(`INSERT into ASSET_LINKS(LINK_URL_TYPE,LINK_URL,LINK_REPOS_TYPE,LINK_DESCRIPTION,LINK_DESCRIPTION_DATA,DEPLOY_STATUS,LINK_ID,ASSET_ID,LINK_ACTIVE) values(
                                    :LINK_URL_TYPE,:LINK_URL,:LINK_REPOS_TYPE,:LINK_DESCRIPTION,:LINK_DESCRIPTION_DATA,:DEPLOY_STATUS,:LINK_ID,:ASSET_ID,'true')`,
                                    oj, {
                                    autoCommit: true
                                }).then(linkres => {
                                    console.log("2nd update Links batch succesfully executed : " + JSON.stringify(linkres));
                                }).catch(err => {
                                    console.log("Links batch insert failed");
                                }).finally(() => {
                                    console.log("---------------------");
                                    console.log("Asset Links section");
                                })
                            })
                        }
                        else {
                            //console.log("oj is empty")
                            return connection.query(`SELECT * from asset_links`, {})
                        }
                    }, function thirdAction() {
                        if (filterArr.length > 0) {
                            console.log(JSON.stringify(filterArr));
                            return connection.batchInsert(`INSERT into ASSET_FILTER_ASSET_MAP values(
                    :FILTER_ASSET_MAP_ID,:FILTER_ID,:ASSET_ID)`, filterArr,
                                {
                                    outFormat: oracledb.Object
                                }).then(res => {
                                    console.log("filters inserted successfully")
                                }).catch(err => {
                                    console.log("Third action error " + err);
                                    reject({ msg: "Asset creation failed on third step" });
                                }).finally(() => {
                                    console.log("---------------------");
                                    console.log("Asset Filter Mapping section");
                                })
                        }
                        else {
                            return connection.query(`SELECT * from ASSET_FILTER_ASSET_MAP`, {})
                        }
                    }
                ], {
                    sequence: true
                })
                    .then((output) => {
                        console.log('create transaction executed!');
                        resolve({ Asset_ID: assetid })
                    })
                    .catch(err => {
                        console.log("transaction Block  : " + err);
                        reject({ msg: "Asset creation failed on transaction failure" });
                    }).finally(() => {
                        console.log('transaction Block completed');
                    })

            }
        })
    }




    static uploadImages(assetId, images, imageDescription) {
        return new Promise((resolve, reject) => {
            let filesArray = [];
            const connection = getDb();
            //console.log(assetId+"/n",images)
            if (images.length > 1) {
                //console.log("multiple images")
                images.forEach(sampleFile => {
                    filesArray = generateFileName(sampleFile, assetId, filesArray, imageDescription);
                })
            }
            else {
                //console.log("single image")
                const sampleFile = images;
                filesArray = generateFileName(sampleFile, assetId, filesArray, imageDescription);
            }
            //console.log(filesArray)
            connection.batchInsert(`INSERT INTO ASSET_IMAGES values(:IMAGE_ID,:ASSET_ID,:IMAGE_NAME,:IMAGEURL,:IMAGE_DESCRIPTION)`,
                filesArray,
                {
                    autoCommit: true,
                }
            ).then(res => {
                resolve('done')
            }).catch(err => {
                //console.log(err)
                reject(err)
            })
        })
    }


    static uploadThumbnail(assetId, thumbnail) {
        return new Promise((resolve, reject) => {
            console.log("inside thumnnail function")
            try {

                const connection = getDb();
                let fname = thumbnail.name.split('.')[0];
                fname = fname.replace(/ /g, '');

                const ftype = thumbnail.name.split('.')[1];
                fname = fname.replace(/[^a-zA-Z0-9]/g, '');
                const uniqueId = uniqid();
                const finalFname = fname + uniqueId.concat('.', ftype);
                //console.log(finalFname)
                const uploadPath = path.join('/', 'mnt/ahfs/assets', assetId, finalFname);
                var content = 'assets/' + assetId + '/' + `${finalFname}`
                //console.log(content)
                // thumbnail.mv(uploadPath, function (err) {
                //     if (err) {
                //         return res.status(500).send(err);
                //     }
                // })

                try {
                    console.log("---------  FOLDER CREATION for thumbnail ----------")
                    const baseresoursePath = path.join('/', 'mnt/ahfs/assets', assetId);
                    console.log("projected path " + baseresoursePath);

                    fs.open(baseresoursePath, 'r', (err) => {
                        if (err) {
                            if (err.code === 'ENOENT') {
                                console.log('folder does not exist');

                                if (!fs.existsSync(baseresoursePath)) {
                                    fs.mkdirSync(baseresoursePath);
                                    console.log("Calling file create " + uploadPath);
                                    thumbnail.mv(uploadPath, function (err) {
                                        if (err) {
                                            return res.status(500).send(err);
                                        }
                                    })
                                }

                            }
                        } else {
                            console.log("Calling file create " + uploadPath);
                            thumbnail.mv(uploadPath, function (err) {
                                if (err) {
                                    return res.status(500).send(err);
                                }
                            })
                        }
                    });

                } catch (err) {
                    console.log("Folder creation failed " + err.message);
                }


                connection.update(`UPDATE ASSET_DETAILS set 
            ASSET_THUMBNAIL=:ASSET_THUMBNAIL
             WHERE ASSET_ID=:ASSET_ID`, [content, assetId],
                    {
                        autoCommit: true
                    }
                ).then(res => {
                    //console.log("thumbnail inserted Successfully")
                    //console.log(res)
                    resolve("working");
                })
            } catch (error) {
                reject({ msg: "Thumnail saving error" });
            }
        })
    }

    static uploadVideo(assetId, video) {
        return new Promise((resolve, reject) => {
            //console.log("inside video function")
            const connection = getDb();
            let fname = video.name.split('.')[0];
            fname = fname.replace(/ /g, '');

            const ftype = video.name.split('.')[1];
            const uniqueId = uniqid();
            const finalFname = fname + uniqueId.concat('.', ftype);
            const uploadPath = path.join(__dirname, '../../../..', 'mnt/ahfs/', finalFname);
            var content = `${finalFname}`
            video.mv(uploadPath, function (err) {
                if (err) {
                    return res.status(500).send(err);
                }
            })
            connection.update(`UPDATE ASSET_DETAILS set 
        ASSET_VIDEO_URL=:ASSET_VIDEO_URL
             WHERE ASSET_ID=:ASSET_ID`, [content, assetId],
                {
                    outFormat: oracledb.Object,
                    autoCommit: true
                }).then(res => {
                    //console.log("video inserted Successfully")
                    resolve("working")
                })
        })
    }
    static uploadDoc(request, data, file) {
        return new Promise((resolve, reject) => {
            const connection = getDb();
            let fname = file.name.split('.')[0];
            fname = fname.replace(/ /g, '');
            const ftype = file.name.split('.')[1];
            const uniqueId = uniqid();
            const finalFname = fname + uniqueId.concat('.', ftype);
            const uploadPath = path.join('/', 'mnt/ahfs/assets', data.assetId, finalFname);
            var content = 'assets/' + data.assetId + "/" + finalFname;
            console.log(finalFname);
            try {
                console.log("---------  FOLDER CREATION ----------")
                const baseresoursePath = path.join('/', 'mnt/ahfs/assets', data.assetId);
                console.log("projected path " + baseresoursePath);

                fs.open(baseresoursePath, 'r', (err) => {
                    if (err) {
                        if (err.code === 'ENOENT') {
                            console.log('folder does not exist');

                            if (!fs.existsSync(baseresoursePath)) {
                                fs.mkdirSync(baseresoursePath);
                                console.log("Calling file create " + uploadPath);
                                file.mv(uploadPath, function (err) {
                                    if (err) {
                                        console.log("Error on file movement: " + JSON.stringify(err));
                                        return res.status(201).send(err);
                                    }
                                })
                            }

                        }
                    } else {
                        console.log("Calling file create " + uploadPath);
                        file.mv(uploadPath, function (err) {
                            if (err) {
                                console.log("Error on file movement: " + JSON.stringify(err));
                                return res.status(201).send(err);
                            }
                        })
                    }
                });

            } catch (err) {
                console.log("Folder creation failed " + err.message);
            }



            connection.update(`INSERT into ASSET_LINKS(LINK_URL_TYPE,LINK_URL,LINK_REPOS_TYPE,LINK_DESCRIPTION,LINK_DESCRIPTION_DATA,DEPLOY_STATUS,LINK_ID,ASSET_ID) values(
                :LINK_URL_TYPE,:LINK_URL,:LINK_REPOS_TYPE,:LINK_DESCRIPTION,:LINK_DESCRIPTION_DATA,:DEPLOY_STATUS,:LINK_ID,:ASSET_ID)
              `, [data.LINK_URL_TYPE, content, data.LINK_REPOS_TYPE, data.LINK_DESCRIPTION, data.LINK_DESCRIPTION_DATA, 0, uniqueId, data.assetId],
                {
                    outFormat: oracledb.Object,
                    autoCommit: true
                }).then(res => {
                    console.log("Document inserted Successfully")
                    resolve("working");
                })
        })
    }


    static createFile(file, path) {
        console.log("Calling file create " + path);
        file.mv(path, function (err) {
            if (err) {
                console.log("file create error " + err.message);
            }
            console.log("File created successfully");
        })
    }
    static uploadCommentByAssetId(reqdata, assetid, comment, commentBy, commentId, commentByUserName) {
        let action;
        let sql;
        let options;
        console.log(assetid)
        return new Promise((resolve, reject) => {
            const connection = getDb();

            if (!commentId) {
                action = "inserted";
                sql = `INSERT into ASSET_COMMENTS values(:COMMENT_ID,:COMMENT_COMMENT,:COMMENTBY,:COMMENTON,:ASSET_ID,:COMMENT_USERNAME)`;
                options = [uniqid(), comment, commentBy, new Date(), assetid, commentByUserName]
            }
            else {
                //console.log("in comment update section")
                action = "updated";
                sql = `UPDATE ASSET_COMMENTS 
                    SET COMMENT_COMMENT=:COMMENT_COMMENT
                     WHERE  COMMENT_ID=:COMMENT_ID`;
                options = [comment, commentId]
            }

            connection.execute(sql, options,
                {
                    outFormat: oracledb.Object,
                    autoCommit: true
                })
                .then(res => {
                    connection.query("select asset_owner from asset_details where asset_id='" + assetid + "'", {}, {
                        outFormat: oracledb.Object
                    }).then(data => {

                        console.log(" --- > " + JSON.stringify(data));
                        reqdata.asset_owner = data[0].ASSET_OWNER;

                        emailnotification.triggerEmailNotificationforFeedback(reqdata);
                    })
                    resolve({ status: "comment " + action + " successfully" });
                })
                .catch(err => {
                    console.log(err)
                })
        })
            .catch(err => {
                console.log(err)
            })

    }


    static uploadLikeByAssetId(assetid, likeBy, likeId, likeByUserName) {
        let action;
        let sql;
        let options;

        return new Promise((resolve, reject) => {
            if (!likeId) {
                action = "inserted"
                sql = `INSERT into ASSET_LIKES values(:LIKE_ID,:ASSET_ID,:LIKE_BY,:LIKE_CREATED,:LIKE_USERNAME)`;
                options = [uniqid(), assetid, likeBy, new Date(), likeByUserName]
            }
            else {
                //console.log("in like unlike section")
                action = "unliked"
                sql = `DELETE from ASSET_LIKES WHERE  LIKE_ID=:LIKE_ID`;
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

    static uploadLikeByAssetId2(assetid, likeBy, like_by_username, action) {

        let sql;
        let options;
        let likeIdGenerated = uniqid();
        return new Promise((resolve, reject) => {
            if (action === "insert") {
                //console.log("like insert section")
                sql = `INSERT into ASSET_LIKES values(:LIKE_ID,:ASSET_ID,:LIKE_BY,:LIKE_CREATED,:LIKE_USERNAME)`;
                options = [likeIdGenerated, assetid, likeBy, new Date(), like_by_username]
            }
            else {
                //console.log("in like unlike section")
                sql = `DELETE from ASSET_LIKES WHERE  LIKE_BY=:LIKE_BY and ASSET_ID=:ASSET_ID`;
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
                    console.log(err)
                })
        })

    }


    static addViewByAssetId(assetId, viewedBy, viewed_by_username, viewed_on) {
        //console.log(assetId + " - " + viewedBy + " - " + viewed_by_username + " - " + viewed_on)
        return new Promise((resolve, reject) => {
            let sql = `INSERT into ASSET_VIEWS(VIEW_ID,
                ASSET_ID,
                VIEWED_BY,
                VIEW_CREATED_ON,
                VIEWED_BY_USERNAME,
                CLIENT_PLATFORM)  values(:0,:1,:2,:3,:4,:5)`;
            let options = [uniqid(), assetId, viewedBy, new Date(), viewed_by_username, viewed_on]
            const connection = getDb();
            connection.execute(sql, options,
                {
                    outFormat: oracledb.Object,
                    autoCommit: true
                })
                .then(res => {
                    resolve({ "status": "view added" })
                })
                .catch(err => {
                    //console.log("View error: " + err);
                    resolve(err)
                })

        })
    }

    static deleteUploadedImageById(imageId) {
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.execute(`DELETE from ASSET_IMAGES WHERE IMAGE_ID=:IMAGE_ID`, [imageId],
                {
                    autoCommit: true,
                    outFormat: oracledb.Object
                })
                .then(res => {
                    //console.log(res)
                    resolve({ msg: 'Image Deleted Successfully' })
                })
        })

    }

    static deleteAllUploadedImages(assetId) {
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.execute(`DELETE from ASSET_IMAGES WHERE ASSET_ID=:ASSET_ID`, [assetId],
                {
                    autoCommit: true,
                    outFormat: oracledb.Object
                })
                .then(res => {
                    resolve('Images Deleted Successfully')
                })
        })
    }

    //delete single link for an asset
    static deleteUploadedLinkById(assetId, linkId) {
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.execute(`DELETE from ASSET_LINKS WHERE LINK_ID=:LINK_ID and ASSET_ID=:ASSET_ID`, [linkId, assetId],
                {
                    autoCommit: true,
                    outFormat: oracledb.Object
                })
                .then(res => {
                    resolve('Link Deleted Successfully')
                })
        })

    }

    static deleteAssetById(assetId) {
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.execute(`DELETE from ASSET_DETAILS WHERE ASSET_ID=:ASSET_ID`, [assetId],
                {
                    autoCommit: true,
                    outFormat: oracledb.Object
                })
                .then(res => {
                    connection.execute(`DELETE from ASSET_IMAGES WHERE ASSET_ID=:ASSET_ID`, [assetId],
                        {
                            autoCommit: true,
                            outFormat: oracledb.Object
                        }).then(res => {
                            connection.execute(`DELETE from ASSET_FILTER_ASSET_MAP WHERE ASSET_ID=:ASSET_ID`, [assetId],
                                {
                                    autoCommit: true,
                                    outFormat: oracledb.Object
                                })
                                .then(res => {
                                    connection.execute(`DELETE from ASSET_LINKS WHERE ASSET_ID=:ASSET_ID`, [assetId],
                                        {
                                            autoCommit: true,
                                            outFormat: oracledb.Object
                                        })
                                        .then(res => {
                                            resolve("Asset deleted successfully");
                                        })
                                })
                        })
                })
        })
    }
    static deleteSearchHistory(user_email) {
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.execute(`DELETE from asset_search_activity WHERE activity_performed_by=:user_email`, [user_email],
                {
                    autoCommit: true,
                    outFormat: oracledb.Object
                })
                .then(res => {
                    resolve("Search history deleted successfully")
                })

        })
    }




    //delete all links for an asset at one go
    static deleteAllUploadedLinks(assetId) {
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.execute(`DELETE from ASSET_LINKS WHERE ASSET_ID=:ASSET_ID`, [assetId],
                {
                    autoCommit: true,
                    outFormat: oracledb.Object
                })
                .then(res => {
                    resolve('Links Deleted Successfully')
                })
        })
    }

    //delete all Docs for an asset by id
    static deleteDocsById(linkids) {
        return new Promise((resolve, reject) => {
            const connection = getDb();
            let ids = "'" + linkids.replace(/,/g, "','") + "'";

            let selectquery = `select * from ASSET_LINKS where LINK_ID in(` + ids + `)`;
            let deletequery = `delete from ASSET_LINKS where LINK_ID in(` + ids + `)`;
            console.log("select Q > > " + selectquery);
            console.log("delete Q > > " + deletequery);

            connection.query(selectquery, [], {
                outFormat: oracledb.Object
            }).then(data => {
                console.log(">>> " + JSON.stringify(data) + "/n/n");

                connection.execute(deletequery, [], {
                    autoCommit: true,
                    outFormat: oracledb.Object
                }).then(datdelresp => {
                    console.log("Deletion > " + JSON.stringify(datdelresp));
                    data.forEach(link => {
                        console.log(link.LINK_REPOS_TYPE + " - " + link.LINK_ID);
                        if (link.LINK_REPOS_TYPE == "DOCUMENT") {
                            console.log("FILE: " + link.LINK_URL);
                            let fileurl = path.join("/mnt/ahfs" + link.LINK_URL.split("8001")[1]);
                            console.log(fileurl + " -> FIle URL EXIST #  " + fs.existsSync(fileurl));
                            try {
                                fs.unlinkSync(fileurl);
                                console.log("File deleted ");
                            } catch (err) {
                                console.log(err.message);
                            }


                        }
                    });
                    resolve({ "msg": "links removed successfully" });
                })


            }).catch(err => {
                console.log("Error : " + err);
                reject({ "msg": "couldn't remove links'" })
            })
            // connection.execute(`DELETE from ASSET_LINKS WHERE ASSET_ID=:ASSET_ID`, [assetId],
            //     {
            //         autoCommit: true,
            //         outFormat: oracledb.Object
            //     })
            //     .then(res => {
            //         resolve('Links Deleted Successfully')
            //     })
        })
    }


    static filterAssetBySearchString(data, filterdata, searchString, filtersasset) {
        searchString = searchString.trim().toLowerCase();
        const oldString = searchString.split(' ');
        const newString = sw.removeStopwords(oldString)
        searchString = newString.join(' ');
        console.log(JSON.stringify("Captured Words ==== > " + searchString));

        let assetFilters = [];

        return new Promise((resolve) => {
            if (searchString.trim().length > 0 && !searchString.includes("undefined")) {
                data.filter(entry => {
                    let combineContentToMatch = entry.ASSET_ID +
                        entry.ASSET_DESCRIPTION +
                        entry.ASSET_CUSTOMER +
                        entry.WIN_BUSINESS_IMPACT +
                        entry.WIN_LESSONS_LEARNED +
                        entry.WIN_CUSTOMER_BUSINESS_CHALLANGES +
                        entry.FILTER_IDS +
                        entry.FILTER_NAMES;

                    let wordlist = searchString.split(/ /);
                    console.log("----- Word combined ------");
                    // console.log(JSON.stringify(wordlist));

                    console.log(combineContentToMatch);
                    console.log(JSON.stringify(entry));
                    combineContentToMatch = combineContentToMatch.toLowerCase();
                    let isMatch = true;

                    for (let i = 0; i < wordlist.length; i++) {
                        if (!combineContentToMatch.includes(wordlist[i])) {
                            isMatch = false;
                            break;
                        }
                    }

                    if (isMatch) {
                        filtersasset.push(entry);
                    }
                })
            } else filtersasset = [...data];

            console.log(data.length + " > Filtered By Search : " + filtersasset.length);
            resolve(filtersasset);
        })
    }

    static fetchAssets(request, offset, limit, filters, searchString, sortBy, order, action, email) {

        return new Promise((resolve, reject) => {
            console.log(filters);
            let finalFilters = filters;//filters.replace('170k5dr4xvz,', '');
            finalFilters = filters.split(',');
            console.log(finalFilters);
            // let filterString = "'" + finalFilters.toString().replace(/,/g, "','") + "'";
            // console.log(" - - > " + filterString);
            // filterString = filters.length > 0 ? ` where filter_id in(` + filterString + `)` : "";

            let interimQuery = '';
            if (finalFilters.length > 1) {
                finalFilters.filter(filter => {
                    interimQuery += interimQuery.includes('select') ? " INTERSECT " : "";
                    interimQuery += `select asset_id from asset_filter_asset_map  where filter_id='${filter}'`;
                })

            } else if (finalFilters.length > 0 && filters.length > 0) {
                interimQuery = `select asset_id from asset_filter_asset_map  where filter_id='${filters}'`;
            } else {
                interimQuery = 'select asset_id from asset_filter_asset_map';
            }
            const connection = getDb();
            let fetchfilterDetailssql = `select a.asset_id,a.ASSET_CUSTOMER,a.ASSET_DESCRIPTION,a.WIN_BUSINESS_IMPACT,a.WIN_LESSONS_LEARNED,
                a.WIN_CUSTOMER_BUSINESS_CHALLANGES,a.ASSET_THUMBNAIL,a.ASSET_CREATED_DATE,
                LISTAGG(c.filter_id,',') as filter_ids,LISTAGG(c.filter_name,',') as filter_names 
                from asset_details a, asset_filter_asset_map b,asset_tags c
                where c.filter_id=b.filter_id and b.asset_id in(${interimQuery}) and a.asset_status='Live' 
                and a.asset_id=b.asset_id group by a.asset_id,a.ASSET_CUSTOMER,a.ASSET_DESCRIPTION,a.WIN_BUSINESS_IMPACT,a.WIN_LESSONS_LEARNED,
                a.WIN_CUSTOMER_BUSINESS_CHALLANGES,a.ASSET_THUMBNAIL,a.ASSET_CREATED_DATE`;
            let fetchfilterDetailsOption = {};
            console.log("Primary SQL >>>> " + fetchfilterDetailssql)
            connection.query(fetchfilterDetailssql, {},
                {
                    outFormat: oracledb.OBJECT
                }).then(data => {

                    let filtersasset = [];
                    this.filterAssetBySearchString(data, null, searchString, filtersasset).then(assetToRefine => {
                        console.log("Filtered array of assets " + assetToRefine.length);
                        this.refineAssets(request, offset, limit, assetToRefine, sortBy, order, action, email).then(assets => {
                            resolve(assets);
                        })
                    })

                }).catch(err => {
                    console.log("error > " + JSON.stringify(err));
                })
        });
    }

    // static fetchAssets(request, offset, limit, filters, searchString, sortBy, order, action, email) {

    //     return new Promise((resolve, reject) => {
    //         console.log(filters);
    //         let finalFilters = filters;//filters.replace('170k5dr4xvz,', '');
    //         console.log(finalFilters);
    //         let filterString = "'" + finalFilters.toString().replace(/,/g, "','") + "'";
    //         console.log(" - - > " + filterString);
    //         filterString = filters.length > 0 ? ` where filter_id in(` + filterString + `)` : "";
    //         const connection = getDb();
    //         let fetchfilterDetailssql = `select a.asset_id,a.ASSET_CUSTOMER,a.ASSET_DESCRIPTION,a.WIN_BUSINESS_IMPACT,a.WIN_LESSONS_LEARNED,
    //             a.WIN_CUSTOMER_BUSINESS_CHALLANGES,a.ASSET_THUMBNAIL,a.ASSET_CREATED_DATE,
    //             LISTAGG(c.filter_id,',') as filter_ids,LISTAGG(c.filter_name,',') as filter_names 
    //             from asset_details a, asset_filter_asset_map b,asset_tags c
    //             where c.filter_id=b.filter_id and b.asset_id in(select asset_id from asset_filter_asset_map ${filterString}) and a.asset_status='Live' 
    //             and a.asset_id=b.asset_id group by a.asset_id,a.ASSET_CUSTOMER,a.ASSET_DESCRIPTION,a.WIN_BUSINESS_IMPACT,a.WIN_LESSONS_LEARNED,
    //             a.WIN_CUSTOMER_BUSINESS_CHALLANGES,a.ASSET_THUMBNAIL,a.ASSET_CREATED_DATE`;
    //         let fetchfilterDetailsOption = {};
    //         console.log("Primary SQL >>>> " + fetchfilterDetailssql)
    //         connection.query(fetchfilterDetailssql, {},
    //             {
    //                 outFormat: oracledb.OBJECT
    //             }).then(data => {

    //                 let filtersasset = [];
    //                 this.filterAssetBySearchString(data, null, searchString, filtersasset).then(assetToRefine => {
    //                     console.log("Filtered array of assets " + assetToRefine.length);
    //                     this.refineAssets(request, offset, limit, assetToRefine, sortBy, order, action, email).then(assets => {
    //                         resolve(assets);
    //                     })
    //                 })

    //             }).catch(err => {
    //                 console.log("error > " + JSON.stringify(err));
    //             })
    //     });
    // }

    static refineAssetsold(request, offset, limit, assetsArray, sortBy, order, action, email) {

        // REMOVE DUPLICATE ENTRIES
        // console.log("*****************************************refineAssets fun start*******************************************")
        // console.log(assetsArray.length)
        let assetidtracker = {};
        let uniqueassetarray = assetsArray.filter(asset => {
            if (!assetidtracker[asset.ASSET_ID]) {
                assetidtracker[asset.ASSET_ID] = 1;
                return asset;
            }
        })
        assetsArray = uniqueassetarray;

        // console.log('****uniqueassetarray Length:***** ' + assetsArray.length)
        let allAssetsObj = {};
        let tAssets = [];
        let allAssets = [];
        let linksArray = [];
        let commentsArray = [];
        let ratingsArray = [];
        let imagesArray = [];
        let linkType = [];
        var lobj2 = {};
        let lobj = {};
        let linkObjArr = [];
        let sql;
        var options = {};
        let likesArray = [];
        let viewsArray = [];
        let solutionAreasArray = [];
        let solutionAreas = [];
        let assetTypes = [];
        let assetTypesArray = [];
        let salesPlays = [];
        let salesPlaysArray = [];
        let industry = [];
        let grouptype = [];
        let groupTypeArray = [];
        let industryArray = [];
        let promotedArray = [];
        return new Promise((resolve, reject) => {
            assetsArray.forEach(asset => {
                asset.ASSET_THUMBNAIL = this.getimagepath(request) + asset.ASSET_THUMBNAIL;
                asset.createdDate = asset.ASSET_CREATED_DATE;
            })
            const connection = getDb();
            connection.execute(`SELECT * from ASSET_LINKS`, {},
                {
                    outFormat: oracledb.OBJECT
                },
            ).then(res => {
                ////console.log("links Details : ",res)
                linksArray = res.rows;
                connection.query(`select Count(*) comment_count,asset_id from 
                asset_comments group by asset_id`, [],
                    {
                        outFormat: oracledb.OBJECT
                    })
                    .then(res => {
                        //console.log("comment count",res)
                        commentsArray = res;
                        connection.query(`select avg(rate) avg_rating,asset_id from asset_rates group by asset_id`, [],
                            {
                                outFormat: oracledb.OBJECT
                            }).then(res => {
                                ratingsArray = res;
                                //console.log(ratingsArray)
                                connection.execute(`SELECT * from ASSET_IMAGES`, {},
                                    {
                                        outFormat: oracledb.OBJECT
                                    })
                                    .then(res => {
                                        imagesArray = res.rows;
                                        connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Solution Area'`, {},
                                            {
                                                outFormat: oracledb.OBJECT
                                            })
                                            .then(res => {
                                                solutionAreasArray = res.rows;
                                                connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_group like 'type_%'`, {},
                                                    {
                                                        outFormat: oracledb.OBJECT
                                                    }).then(res => {
                                                        groupTypeArray = res.rows;
                                                        connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Asset Type'`, {},
                                                            {
                                                                outFormat: oracledb.OBJECT
                                                            })
                                                            .then(res => {
                                                                assetTypesArray = res.rows;
                                                                connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Sales Initiatives'`, {},
                                                                    {
                                                                        outFormat: oracledb.OBJECT
                                                                    })
                                                                    .then(res => {
                                                                        salesPlaysArray = res.rows;
                                                                        connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Industry'`, {},
                                                                            {
                                                                                outFormat: oracledb.OBJECT
                                                                            })
                                                                            .then(res => {
                                                                                industryArray = res.rows;
                                                                                //console.log(solutionAreasArray)
                                                                                connection.query(`select USER_LOB from asset_user where USER_EMAIL='` + email + `'`, [],
                                                                                    {
                                                                                        outFormat: oracledb.OBJECT
                                                                                    })
                                                                                    .then(lob => {
                                                                                        if (email == undefined || email.length === 0)
                                                                                            lob.push({ "USER_LOB": 'Others' });
                                                                                        let sqlquery = ``
                                                                                        if (lob[0].USER_LOB === 'Others') {
                                                                                            sqlquery = `SELECT asset_id from ASSET_LOB_LEADER_PROMOTED_ASSETS where status=1 and LOB_LEADER_LOB in (select USER_LOB from asset_user)`
                                                                                        } else {
                                                                                            let lobs = "'Others','" + lob[0].USER_LOB + "'";
                                                                                            sqlquery = `SELECT asset_id from ASSET_LOB_LEADER_PROMOTED_ASSETS where status=1 and LOB_LEADER_LOB in (` + lobs + `)`
                                                                                        }
                                                                                        connection.query(sqlquery, [],
                                                                                            {
                                                                                                outFormat: oracledb.OBJECT
                                                                                            })
                                                                                            .then(res => {
                                                                                                promotedArray = res;
                                                                                                connection.execute(`SELECT count(*) like_count,asset_id from ASSET_LIKES group by asset_id`, [],
                                                                                                    {
                                                                                                        outFormat: oracledb.OBJECT
                                                                                                    })
                                                                                                    .then(res => {
                                                                                                        connection.execute(`SELECT count(*) like_count,asset_id from ASSET_LIKES group by asset_id`, [],
                                                                                                            {
                                                                                                                outFormat: oracledb.OBJECT
                                                                                                            })
                                                                                                            .then(res => {
                                                                                                                likesArray = res.rows;
                                                                                                                connection.execute(`SELECT count(*) view_count,asset_id from ASSET_VIEWS group by asset_id`, [],
                                                                                                                    {
                                                                                                                        outFormat: oracledb.OBJECT
                                                                                                                    })
                                                                                                                    .then(res => {
                                                                                                                        viewsArray = res.rows;
                                                                                                                        connection.query(`select count(*) as count,activity_content_id from ASSET_USER_activity where activity_type='share' group by activity_content_id`, [],
                                                                                                                            {
                                                                                                                                outFormat: oracledb.OBJECT
                                                                                                                            })
                                                                                                                            .then(sharecountarr => {
                                                                                                                                // console.log(" -- > "+JSON.stringify(sharecountarr));
                                                                                                                                assetsArray.forEach(asset => {
                                                                                                                                    const id = asset.ASSET_ID;
                                                                                                                                    allAssetsObj = asset
                                                                                                                                    allAssetsObj.LINKS = [];
                                                                                                                                    var links = linksArray.filter(link => link.ASSET_ID === id)
                                                                                                                                    ////console.log('links:',links)
                                                                                                                                    solutionAreas = solutionAreasArray.filter(s => s.ASSET_ID === id)
                                                                                                                                    assetTypes = assetTypesArray.filter(s => s.ASSET_ID === id)
                                                                                                                                    salesPlays = salesPlaysArray.filter(s => s.ASSET_ID === id)
                                                                                                                                    industry = industryArray.filter(s => s.ASSET_ID === id);
                                                                                                                                    grouptype = groupTypeArray.filter(s => s.ASSET_ID === id);
                                                                                                                                    let promote = promotedArray.filter(s => s.ASSET_ID === id);
                                                                                                                                    let sharecount = sharecountarr.filter(s => s.ACTIVITY_CONTENT_ID === id);
                                                                                                                                    // console.log("-------------- SHARE COUNT  ----------------");

                                                                                                                                    // console.log(" -- > "+JSON.stringify(sharecount));
                                                                                                                                    allAssetsObj.sharecount = sharecount.length > 0 ? sharecount[0].COUNT : 0;
                                                                                                                                    allAssetsObj.GROUP_TYPE = grouptype;
                                                                                                                                    allAssetsObj.PROMOTE = promote.length == 0 ? false : true;
                                                                                                                                    allAssetsObj.SOLUTION_AREAS = solutionAreas;
                                                                                                                                    allAssetsObj.ASSET_TYPE = assetTypes;
                                                                                                                                    allAssetsObj.SALES_PLAY = salesPlays;
                                                                                                                                    allAssetsObj.INDUSTRY = industry;
                                                                                                                                    allAssetsObj.ASSET_THUMBNAIL = allAssetsObj.ASSET_THUMBNAIL == null ? this.getimagepath(request) + '/no_image.png' : allAssetsObj.ASSET_THUMBNAIL;

                                                                                                                                    linkType = links.map(a => a.LINK_REPOS_TYPE)
                                                                                                                                    linkType = [...new Set(linkType)]
                                                                                                                                    ////console.log(linkType)
                                                                                                                                    linkType.forEach(type => {
                                                                                                                                        var links2 = linksArray.filter(link => link.LINK_REPOS_TYPE === type && link.ASSET_ID === id)
                                                                                                                                        lobj.TYPE = type;
                                                                                                                                        lobj.arr = links2;
                                                                                                                                        lobj2 = lobj
                                                                                                                                        linkObjArr.push(lobj2);
                                                                                                                                        lobj = {}
                                                                                                                                    })
                                                                                                                                    allAssetsObj.LINKS = linkObjArr;

                                                                                                                                    linkObjArr = [];
                                                                                                                                    ////console.log(lobj2,"obj2")
                                                                                                                                    var images = imagesArray.filter(image => image.ASSET_ID === id);
                                                                                                                                    images.forEach(image => {
                                                                                                                                        image.IMAGEURL = this.getimagepath(request) + image.IMAGEURL;
                                                                                                                                    });
                                                                                                                                    allAssetsObj.IMAGES = images;
                                                                                                                                    var comments = commentsArray.filter(c => c.ASSET_ID === id);

                                                                                                                                    var ratings = ratingsArray.filter(r => r.ASSET_ID === id)
                                                                                                                                    var likes = likesArray.filter(l => l.ASSET_ID === id)
                                                                                                                                    var views = viewsArray.filter(v => v.ASSET_ID === id)
                                                                                                                                    //console.log(...views);
                                                                                                                                    if (comments[0]) {
                                                                                                                                        delete comments[0].ASSET_ID;

                                                                                                                                    }
                                                                                                                                    if (!comments.length) {
                                                                                                                                        comments.push({ COMMENT_COUNT: 0 });
                                                                                                                                    }
                                                                                                                                    if (!ratings.length) {
                                                                                                                                        ratings.push({ AVG_RATING: 0, ASSET_ID: id })
                                                                                                                                    }
                                                                                                                                    if (!likes.length) {
                                                                                                                                        likes.push({ LIKE_COUNT: 0, ASSET_ID: id })
                                                                                                                                    }
                                                                                                                                    if (!views.length) {
                                                                                                                                        views.push({ VIEW_COUNT: 0, ASSET_ID: id })
                                                                                                                                    }

                                                                                                                                    allAssetsObj.COMMENTS = comments[0];
                                                                                                                                    allAssetsObj.RATINGS = ratings[0];
                                                                                                                                    allAssetsObj.LIKES = likes[0];
                                                                                                                                    allAssetsObj.VIEWS = views[0];

                                                                                                                                    if (!(sortBy == 'views' && allAssetsObj.VIEWS.VIEW_COUNT == 0)) {
                                                                                                                                        allAssets.push(allAssetsObj)
                                                                                                                                    }
                                                                                                                                })

                                                                                                                                let allObj = {};
                                                                                                                                allObj.TOTALCOUNT = allAssets.length;



                                                                                                                                // console.log("Asset Count after slice :::: " + tAssets.length);
                                                                                                                                dynamicSort(allAssets, sortBy, order);
                                                                                                                                tAssets = allAssets.slice(offset, limit);
                                                                                                                                console.log(offset + ' ----- ' + limit + "Asset Count before slice :::: " + allAssets.length);

                                                                                                                                console.log("Asset Count :::: " + tAssets.length);
                                                                                                                                this.sortAssetsByType(tAssets).then(sortedAssets => {
                                                                                                                                    allObj.ASSETS = sortedAssets;
                                                                                                                                    resolve(allObj);
                                                                                                                                })

                                                                                                                                //}

                                                                                                                            })
                                                                                                                    })
                                                                                                            })
                                                                                                    })
                                                                                            })
                                                                                    })
                                                                            })
                                                                    })
                                                            })
                                                    })
                                            })
                                    })
                            })

                    })
            })
        })
    }

    static getimagepath(request) {
        return (request.headers.host.toLowerCase().includes(':') ? 'http://' + request.headers.host + "/" : 'https://' + request.headers.host + "/image/");
    }

    static sortAssetsByType(assets) {
        return new Promise((resolve, reject) => {
            let sortedAssets = {};

            const connection = getDb();
            connection.query(`select filter_name,filter_id from asset_tags where filter_parent_id='goek85ttc43'`, {},
                {
                    outFormat: oracledb.OBJECT
                })
                .then(typeFilters => {
                    assets.filter(asset => {
                        typeFilters.filter(filter => {
                            if (asset.FILTER_IDS.includes(filter.FILTER_ID)) {
                                if (sortedAssets[filter.FILTER_ID] == undefined) {
                                    sortedAssets[filter.FILTER_ID] = [];
                                }
                                sortedAssets[filter.FILTER_ID].push(asset);
                            }
                        })
                    })
                    resolve(sortedAssets);

                })

        })
    }

    static refineAssets(request, offset, limit, assetsArray, sortBy, order, action, email) {

        let assetidtracker = {};
        let uniqueassetarray = assetsArray.filter(asset => {
            if (!assetidtracker[asset.ASSET_ID]) {
                assetidtracker[asset.ASSET_ID] = 1;
                return asset;
            }
        })
        assetsArray = uniqueassetarray;
        console.log("In refine  " + assetsArray.length);

        let allAssetsObj = {};
        let tAssets = [];
        let allAssets = [];

        let viewsArray = [];

        return new Promise((resolve, reject) => {

            const connection = getDb();

            connection.execute(`SELECT ROUND(count(*)/2)view_count,asset_id from ASSET_VIEWS group by asset_id`, [],
                {
                    outFormat: oracledb.OBJECT
                })
                .then(res => {
                    viewsArray = res.rows;

                    assetsArray.forEach(asset => {
                        const id = asset.ASSET_ID;
                        allAssetsObj = asset
                        allAssetsObj.LINKS = [];

                        // asset.ASSET_THUMBNAIL = this.getimagepath(request) + asset.ASSET_THUMBNAIL;
                        asset.createdDate = asset.ASSET_CREATED_DATE;

                        // console.log(id + " Image Path: " + allAssetsObj.ASSET_THUMBNAIL);

                        allAssetsObj.ASSET_THUMBNAIL = (allAssetsObj.ASSET_THUMBNAIL != null && allAssetsObj.ASSET_THUMBNAIL.trim().length > 0) ? this.getimagepath(request) + allAssetsObj.ASSET_THUMBNAIL : this.getimagepath(request) + '/no_image.png';

                        var views = viewsArray.filter(v => v.ASSET_ID === id);

                        allAssetsObj.VIEWS = views.length == 0 ? { VIEW_COUNT: 0, ASSET_ID: id } : views[0];
                        // console.log(id + " Image Path: " + allAssetsObj.ASSET_THUMBNAIL);

                        if (!(sortBy == 'views' && allAssetsObj.VIEWS.VIEW_COUNT == 0)) {
                            allAssets.push(allAssetsObj);
                        }
                    })

                    let allObj = {};
                    allObj.TOTALCOUNT = allAssets.length;


                    // console.log("Asset Count after slice :::: " + tAssets.length);
                    dynamicSort(allAssets, sortBy, order);
                    tAssets = allAssets.slice(offset, limit);
                    console.log(offset + ' ----- ' + limit + "Asset Count before slice :::: " + allAssets.length);
                    allObj.ASSETS = tAssets;
                    console.log("Asset Count :::: " + tAssets.length);
                    this.sortAssetsByType(tAssets).then(sortedAssets => {
                        allObj.ASSETS = sortedAssets;
                        resolve(allObj);
                    })
                    //}

                    // })
                })
            // })
            //                                                                                         })
            //                                                                                 })
            //                                                                         })
            //                                                                 })
            //                                                         })
            //                                                 })
            //                                         })
            //                                 })
            //                         })
            //                 })

            //         })
            // })
        })
    }


    // CONVERT SQL BASED ON AND CLAUSE
    static convertsql(data) {
        let queryString = "";
        return new Promise((resolve, reject) => {
            // CREATE SQL queries   
            if (data.length > 0) {

                let assetidList = '';
                data.filter(id => assetidList += assetidList.length > 0 ? ",'" + id.ASSET_ID + "'" : "'" + id.ASSET_ID + "'");
                queryString = `select a.*,c.filter_id,c.filter_parent_id from asset_details a, asset_filter_asset_map b, asset_tags c 
                where a.asset_id=b.asset_id and b.filter_id=c.filter_id and b.asset_id 
                in(`+ assetidList + `) and c.filter_id 
                in(select filter_id from asset_tags where filter_parent_id is null)`

            } else {
                queryString = `select b.* from  (select distinct ASSET_ID from ASSET_FILTER_ASSET_MAP c,asset_tags d 
                    where c.filter_id=d.filter_id ) 
                    a,asset_details b,asset_filter_asset_map c,asset_tags d 
                    where a.ASSET_ID=b.ASSET_ID and b.asset_status='Live' and c.asset_id=b.asset_id 
                    and c.filter_id=d.filter_id and c.filter_id 
                    in(select filter_id from asset_tags where filter_parent_id 
                    in(select filter_id from asset_tags where filter_parent_id is null))`;

            }
            console.log("--------- Convert  QUERY  -------");
            console.log(queryString);
            // RETURN THE GENERATED QUERY 
            resolve(queryString);
        })
    }



    // CREATE QUERY STRING BASED ON SELECTED FILTERS LOGICAL AND && OR
    // static convertsql(data) {
    // console.log("----------  Converting SQL ASSET -------------");
    // let filterTypeMap = {};
    // let queryString = "";
    // // let reducedFilter = data.filter(filter => {
    // //     if (filter.FILTER_ID.indexOf("14983ddhswcdol") == -1 && filter.FILTER_ID.indexOf("Gdjfdskyuetr472V") == -1 && filter.FILTER_ID.indexOf("fd5k53p09dl") == -1 ) {//&& filter.FILTER_ID.indexOf("170k5dr4xvz") == -1
    // //         return filter;
    // //     }
    // // })

    // // data = reducedFilter;
    // console.log(JSON.stringify(data));

    // return new Promise((resolve, reject) => {
    //     // CREATE SQL queries   
    //     if (data.length > 0) {
    //         data.forEach(val => {
    //             let filterstring = filterTypeMap[val.FILTER_TYPE] != undefined ? filterTypeMap[val.FILTER_TYPE] + " INTERSECT select c.ASSET_ID from ASSET_FILTER_ASSET_MAP c,asset_tags d where " : "select c.ASSET_ID from ASSET_FILTER_ASSET_MAP c,asset_tags d where ";
    //             filterTypeMap[val.FILTER_TYPE] = filterstring + " d.filter_id='" + val.FILTER_ID + "' and c.filter_id=d.filter_id and  d.filter_parent_id is not null";
    //         });

    //         Object.keys(filterTypeMap).forEach(filterType => {

    //             queryString = queryString.length > 0 ? queryString + " INTERSECT " + filterTypeMap[filterType] : filterTypeMap[filterType];
    //         })

    //         queryString = `select b.* from  (` + queryString + `) a,asset_details b,asset_filter_asset_map b,asset_tags c where a.asset_id=b.asset_id and b.asset_status='Live' and b.asset_id=a.asset_id and b.filter_id=c.filter_id and b.filter_id in(select filter_id from asset_tags where filter_parent_id 
    //             in(select filter_id from asset_tags where filter_parent_id is null))`;

    //     } else {
    //         queryString = `select b.* from  (select distinct ASSET_ID from ASSET_FILTER_ASSET_MAP c,asset_tags d 
    //             where c.filter_id=d.filter_id ) 
    //             a,asset_details b,asset_filter_asset_map c,asset_tags d 
    //             where a.ASSET_ID=b.ASSET_ID and b.asset_status='Live' and c.asset_id=b.asset_id 
    //             and c.filter_id=d.filter_id and c.filter_id 
    //             in(select filter_id from asset_tags where filter_parent_id 
    //             in(select filter_id from asset_tags where filter_parent_id is null))`;

    //     }
    //     console.log("--------- Convert  QUERY  -------");
    //     console.log(queryString);
    //     // RETURN THE GENERATED QUERY 
    //     resolve(queryString);
    // })
    // }



    static fetchPreferedAssets(request, userEmail, sortBy, order, keywords = []) {
        const offset = 0
        let limit;
        const connection = getDb();
        let finalList = [];
        return new Promise((resolve, reject) => {

            // GET THE PREFERED FILTERS
            let fetchPreferedFilterSql = "select asset_filter_id from asset_preferences where user_email='" + userEmail + "'";
            connection.query(fetchPreferedFilterSql, {},
                {
                    outFormat: oracledb.OBJECT
                },
            ).then(filterList => {
                let filterids = '';
                if (filterList.length > 0) {
                    filterids = filterList.map(filter => filter.ASSET_FILTER_ID).join().replace(/,/g, "','");
                }
                // console.log(JSON.stringify(filterids));
                let fetchAssetsSql = `select b.* from asset_filter_asset_map a, asset_details b 
                where a.filter_id in('`+ filterids + `') 
                and a.asset_id=b.asset_id and b.asset_status='Live'`;

                console.log("> " + fetchAssetsSql);
                connection.query(fetchAssetsSql, {},
                    {
                        outFormat: oracledb.OBJECT
                    },
                ).then(preferedassets => {
                    // console.log(JSON.stringify(assetlist));

                    let fetchtopwordssql = `select activity_filter, count(*) as frequency from asset_search_activity 
                    where activity_performed_by='` + userEmail + `' 
                    group by activity_filter 
                    order by frequency desc 
                    FETCH NEXT 3 ROWS ONLY`
                    connection.query(fetchtopwordssql, {},
                        {
                            outFormat: oracledb.OBJECT
                        },
                    ).then(words => {
                        let fetchallLiveAssets = `select * from asset_details where asset_status='Live'`
                        connection.query(fetchallLiveAssets, {},
                            {
                                outFormat: oracledb.OBJECT
                            },
                        ).then(allassets => {
                            console.log("------------------- Prefered asset --------------");
                            console.log(JSON.stringify(words));
                            console.log(JSON.stringify(filterids));
                            // if (filterids.trim().length > 0 || words.length > 0) {
                            //     finalList = [...assetlist];
                            // }

                            if (words.length == 0) {
                                allassets = [];
                            }
                            let wordlist = "";
                            words.map(word => {
                                wordlist = wordlist + " " + word.ACTIVITY_FILTER
                            });

                            let fetchAllFilterSQL = `select a.filter_id,a.filter_name,a.filter_type,b.asset_id from asset_filter a, asset_filter_asset_map b where a.filter_id=b.filter_id and a.filter_status=1`;

                            connection.query(fetchAllFilterSQL, {},
                                {
                                    outFormat: oracledb.OBJECT
                                }).then(filterdata => {
                                    let filtersasset = [];

                                    this.filterAssetBySearchString(allassets, filterdata, wordlist, filtersasset).then(res => {
                                        filtersasset = [...filtersasset, ...preferedassets];
                                        this.refineAssets(request, offset, limit, filtersasset, sortBy, order, "", userEmail).then(assets => {
                                            resolve(assets);
                                        })
                                    })
                                })
                        })

                    })
                })
            })
        })
    }


    static fetchAssetsById(assetId, request, user_email) {
        let assetObj = {}
        let linkObjArr = [];
        let lobj = {};
        let lobj2 = {};
        let filterType = [];
        let filterArr = [];
        let filterObj = {};
        let filterTypeArr = [];
        let filterArrFinal = [];
        let solutionAreas = [];
        let assetTypes = [];
        let salesPlays = [];
        let ratingAvg = [];
        let promote;
        let Industry = []
        return new Promise((resolve, reject) => {
            updateViewByAssetId(assetId, user_email)
                .then(res => {
                    console.log(assetId + " << view >> " + JSON.stringify(res));
                    getAssetsById(assetId)
                        .then(res => {
                            // //console.log(res)
                            assetObj = res[0];

                            if (!res.length > 0) {
                                resolve("No such asset")
                            }
                            else {
                                //resolve(res[0])
                                // console.log(JSON.stringify(assetObj));
                                try {
                                    assetObj.WIN_TCV_ARR = assetObj.WIN_TCV_ARR != null && WIN_TCV_ARR.trim().length > 0 ? parseInt(WIN_TCV_ARR.trim()) : parseInt('0');

                                } catch (error) {
                                    console.log(error);
                                }
                                getLinksById(assetId)
                                    .then(res => {
                                        console.log("Links >> " + JSON.stringify(res));

                                        let linkMap = {}
                                        let finalinkList = []
                                        res.filter(link => {
                                            let linklist = linkMap[link.LINK_REPOS_TYPE] || [];
                                            link.LINK_URL = link.LINK_URL_TYPE == 'DOCUMENT' ? this.getimagepath(request) + link.LINK_URL : link.LINK_URL;
                                            linklist.push(link);
                                            linkMap[link.LINK_REPOS_TYPE] = linklist;
                                        })
                                        Object.keys(linkMap).filter(type => {
                                            finalinkList.push({
                                                TYPE: type,
                                                arr: linkMap[type]
                                            })
                                        })

                                        // let linkType = [];
                                        // linkType = res.map(a => a.LINK_REPOS_TYPE)
                                        // linkType = [...new Set(linkType)]
                                        // ////console.log(linkType)
                                        // linkType.forEach(type => {

                                        //     let link2 = []
                                        //     res.filter(link => {
                                        //         link.LINK_URL = this.getimagepath(request) + link.LINK_URL;
                                        //         link.LINK_REPOS_TYPE === type
                                        //         link2.push(link);
                                        //     })
                                        //     lobj.TYPE = type;
                                        //     lobj.arr = [...link2];
                                        //     lobj2 = lobj
                                        //     linkObjArr.push(lobj2);
                                        //     lobj = {}
                                        // })

                                        // console.log(JSON.stringify(linkObjArr));
                                        console.log(JSON.stringify(finalinkList));

                                        assetObj.LINKS = finalinkList;
                                        // assetObj.ASSET_THUMBNAIL = request.protocol +'://'+ request.headers.host + this.getimagepath(request.protocol)+ '/' + assetObj.ASSET_THUMBNAIL;
                                        assetObj.ASSET_THUMBNAIL = assetObj.ASSET_THUMBNAIL != null && assetObj.ASSET_THUMBNAIL.trim().length > 0 ? this.getimagepath(request) + assetObj.ASSET_THUMBNAIL : this.getimagepath(request) + 'no_image.png';
                                        assetObj.WIN_LOGO = assetObj.WIN_LOGO != null && assetObj.WIN_LOGO.trim().length > 0 ? this.getimagepath(request) + assetObj.WIN_LOGO : assetObj.WIN_LOGO;

                                        console.log("Image path >> " + assetObj.ASSET_THUMBNAIL);
                                        getImagesById(assetId)
                                            .then(res => {
                                                //  //console.log(res)
                                                assetObj.IMAGES = res;
                                                assetObj.IMAGES.forEach(image => {
                                                    image.IMAGEURL = this.getimagepath(request) + image.IMAGEURL;
                                                });

                                                getCommentsById(assetId, request)
                                                    .then(res => {
                                                        assetObj.COMMENTS = res;
                                                        getRatingsById(assetId)
                                                            .then(res => {
                                                                ratingAvg = res;
                                                                getNACTLOBByAssetId(assetId)
                                                                    .then(res => {
                                                                        assetObj.NACTLOB = res;
                                                                        getWorkloadCatByAssetId(assetId)
                                                                            .then(res => {
                                                                                assetObj.WORKLOADCATEGORY = res;
                                                                                getIndustryByAssetId(assetId)
                                                                                    .then(res => {
                                                                                        assetObj.INDUSTRY = res;
                                                                                        getPartnerById(assetId, user_email)
                                                                                            .then(res => {
                                                                                                // console.log(res);
                                                                                                assetObj.PARTNER = res;
                                                                                                getAssetTypeByAssetId(assetId).then(res => {
                                                                                                    // console.log(res);
                                                                                                    assetObj.ASSETTYPE = res;
                                                                                                    getCompetetionByAssetId(assetId)
                                                                                                        .then(res => {
                                                                                                            assetObj.COMPETETION = res;

                                                                                                            var avgArr = ratingAvg.map(r => r.RATE);
                                                                                                            assetObj.AVG_RATING = avgArr.reduce((a, b) => a + b, 0) / avgArr.length;
                                                                                                            getAssetFilterMapByIdandType(assetId).then(res => {
                                                                                                                filterArr = [...res]
                                                                                                                filterType = filterArr.map(a => a.FILTER_TYPE)
                                                                                                                filterType = [...new Set(filterType)]
                                                                                                                //console.log(filterType)
                                                                                                                filterType.forEach(type => {
                                                                                                                    filterTypeArr = filterArr.filter(f => f.FILTER_TYPE === type)
                                                                                                                    filterObj.TYPE = type;
                                                                                                                    filterObj.arr = filterTypeArr;
                                                                                                                    filterArrFinal.push(filterObj)
                                                                                                                    filterObj = {};
                                                                                                                })
                                                                                                                //console.log(filterObj)
                                                                                                                assetObj.FILTERMAP = filterArrFinal[0].arr;
                                                                                                                resolve(assetObj)

                                                                                                            })
                                                                                                        })
                                                                                                })
                                                                                            })
                                                                                    })
                                                                            })
                                                                    })
                                                            })

                                                    })
                                            })
                                    })
                            }
                        })
                })
        })

    }
    static fetchLinksById(assetId) {
        return new Promise((resolve, reject) => {
            getLinksById(assetId)
                .then(res => {
                    //console.log(res)
                    resolve(res)
                })
        })
    }
    static fetchImagesById(assetId) {
        return new Promise((resolve, reject) => {
            getImagesById(assetId)
                .then(res => {
                    //console.log(res)
                    resolve(res)
                })
        })
    }

    static getBannerCounts() {
        let bannerObj = {};
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.query(`select
            (select count(*) from asset_details where asset_status='Live') "asset_Count",
            (select  count(distinct a.winstory_id) from ASSET_WINSTORY_DETAILS a, asset_winstory_filter_winstory_map b where a.WINSTORY_STATUS='Live' and  a.winstory_id=b.winstory_id) "winstory_Count",
            (select count(*) from asset_hub) "hubs_Count" from dual`, {},
                {
                    outFormat: oracledb.OBJECT
                })
                .then(res => {
                    bannerObj = res[0];
                    connection.query(`select HUB_NAME from asset_hub`, {},
                        {
                            outFormat: oracledb.OBJECT
                        })
                        .then(res => {
                            bannerObj.hubs = res;
                            connection.query(`select activity_platform as platform, count(*) as count from asset_user_activity group by activity_platform`, {},
                                {
                                    outFormat: oracledb.OBJECT
                                })
                                .then(res => {
                                    if (res.length > 0) {
                                        if (res.length == 1) {
                                            if (res[0].PLATFORM == "m") {
                                                res.push({
                                                    PLATFORM: "w",
                                                    COUNT: 0
                                                })
                                            } else if (res[0].PLATFORM == "w") {
                                                res.push({
                                                    PLATFORM: "m",
                                                    COUNT: 0
                                                })
                                            }
                                        }
                                        bannerObj.visit = res;
                                        resolve(bannerObj)
                                    } else {
                                        let emptyVisit = [];
                                        emptyVisit.push({
                                            PLATFORM: "m",
                                            COUNT: 0
                                        });

                                        emptyVisit.push({
                                            PLATFORM: "w",
                                            COUNT: 0
                                        });

                                        bannerObj.visit = emptyVisit;

                                        resolve(bannerObj)
                                    }
                                })
                        })
                })
                .catch(err => {
                    reject(err)

                })
        })
    }




    static getSocialDataByAssetId(request, assetId, userId) {
        let assetSocialObj = {}
        return new Promise((resolve, reject) => {
            getSharecountByAssetId(assetId)
                .then(sharecount => {
                    assetSocialObj.sharecount = sharecount[0].COUNT;
                    getCommentsById(assetId, request)
                        .then(comments => {
                            assetSocialObj.COMMENTS = comments;
                            getLikesByAssetId(request, assetId)
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

        })
    }


    static getFilters(user_email, request, platform) {
        // console.log("fetching filters >" + user_email);
        let typeArr = [];
        let filteredArr = [];
        let allFilters = [];
        let filterObj = {};
        let userPreferencesArr = [];
        let finalFilterObj = {}
        let countArr = [];
        let winstorycountArr = [];
        let typeCountArr = [];
        let winstorytypeCountArr = [];
        let sugestionsarr = [];
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.query(`select filter_id from asset_filter where filter_id in (Select asset_filter_id from asset_preferences where USER_EMAIL=:USER_EMAIL)`, [user_email],
                {
                    outFormat: oracledb.OBJECT
                }).then(res => {
                    res.forEach(f_id => {

                        let preferenceId = Object.values(f_id)
                        userPreferencesArr.push(preferenceId[0]);

                    })
                    connection.query(`select 
                    a.activity_filter,
                    count(*) as count,
                    a.activity_type,
                    nvl(b.filter_name,' ') as filter_name 
                    from asset_search_activity a left join asset_filter b 
                    on a.activity_filter=b.filter_id 
                    where a.activity_performed_by='`+ user_email + `'  
                    and a.activity_filter is not null 
                    group by a.activity_filter,a.activity_type,b.filter_name 
                    order by count(*) desc,a.activity_type`, [],
                        {
                            outFormat: oracledb.OBJECT
                        })
                        .then(result => {
                            let traceunique = "";
                            sugestionsarr = result.filter(suggest => {
                                // console.log(traceunique);
                                // console.log(suggest.ACTIVITY_FILTER + " - " + suggest.FILTER_NAME);
                                // console.log(traceunique.toLowerCase().indexOf(suggest.ACTIVITY_FILTER.trim().toLowerCase()) + " - " + traceunique.toLowerCase().indexOf(suggest.FILTER_NAME.toLowerCase()))
                                if (traceunique.toLowerCase().indexOf(suggest.ACTIVITY_FILTER.trim().toLowerCase()) == -1 && traceunique.toLowerCase().indexOf(suggest.FILTER_NAME.toLowerCase()) == -1) {
                                    // console.log("IN");
                                    traceunique += suggest.FILTER_NAME.trim() + suggest.ACTIVITY_FILTER.trim();
                                    traceunique = traceunique.replace(/ /g, "");
                                    return suggest;
                                }

                            })
                            // console.log(traceunique);



                            connection.query(`select distinct f.filter_id,count(asset_id) cnt from asset_filter f full outer join 
                            (select m.filter_id,d.asset_id from asset_filter_asset_map m join ASSET_DETAILS d on 
                            (m.asset_id=d.asset_id) where d.ASSET_STATUS='Live') a on (f.filter_id=a.filter_id) group by f.filter_id`, [],
                                {
                                    outFormat: oracledb.OBJECT
                                })
                                .then(result => {
                                    countArr = result;
                                    //console.log(JSON.stringify(countArr));
                                    connection.query(`select distinct f.filter_id,count(WINSTORY_ID) cnt from asset_filter f full outer join 
                            (select m.filter_id,d.WINSTORY_ID from asset_winstory_filter_winstory_map m join ASSET_WINSTORY_DETAILS d on 
                            (m.WINSTORY_ID=d.WINSTORY_ID) where d.WINSTORY_STATUS='Live') a on (f.filter_id=a.filter_id) group by f.filter_id`, [],
                                        {
                                            outFormat: oracledb.OBJECT
                                        })
                                        .then(result => {
                                            winstorycountArr = result;
                                            let getFilterSQL;
                                            if (platform == "w") {
                                                getFilterSQL = `select * from asset_filter where FILTER_STATUS in('1','-1')`;

                                            } else {
                                                getFilterSQL = `select * from asset_filter where FILTER_STATUS in('1')`;
                                            }

                                            connection.query(getFilterSQL, [],
                                                {
                                                    outFormat: oracledb.OBJECT
                                                })
                                                .then(filters => {
                                                    typeArr = filters.map(f => f.FILTER_TYPE)
                                                    typeArr = [...new Set(typeArr)]
                                                    typeArr.sort(function (a, b) {
                                                        if (a < b) //sort string ascending
                                                            return -1;
                                                        if (a > b)
                                                            return 1;
                                                        return 0; //default return value (no sorting)
                                                    });
                                                    typeArr.forEach(type => {
                                                        console.log(JSON.stringify(type));
                                                        // console.log(JSON.stringify(filteredArr));
                                                        if (filterObj != undefined) {
                                                            filteredArr = filters.filter(f => f.FILTER_TYPE != null && f.FILTER_TYPE === type && f.FILTER_NAME != null && !f.FILTER_NAME.toLowerCase().includes('other'));

                                                            filterObj.Type = type;
                                                            filterObj.FILTER_TYPE_IMAGE = this.getimagepath(request) + filteredArr[0].FILTER_TYPE_IMAGE;
                                                            filteredArr.sort((a, b) => (a.FILTER_NAME > b.FILTER_NAME) ? 1 : -1)
                                                            const otherArr = filters.filter(f => f.FILTER_TYPE != null && f.FILTER_TYPE === type && f.FILTER_NAME != null && f.FILTER_NAME.toLowerCase().includes('other'))
                                                            if (otherArr.length === 1) {
                                                                filteredArr.push(otherArr[0]);
                                                            }
                                                            else {
                                                                otherArr.forEach(o => {
                                                                    filteredArr.push(o)
                                                                })
                                                            }
                                                            filteredArr.forEach(f => {
                                                                typeCountArr = countArr.filter(r => r.FILTER_ID === f.FILTER_ID)
                                                                winstorytypeCountArr = winstorycountArr.filter(r => r.FILTER_ID === f.FILTER_ID)
                                                                f.ASSET_COUNT = typeCountArr[0].CNT
                                                                f.WINSTORY_COUNT = winstorytypeCountArr[0].CNT
                                                                // console.log("f.FILTER_IMAGE" + ': ' + f.FILTER_IMAGE);
                                                                f.FILTER_TYPE_IMAGE = this.getimagepath(request) + f.FILTER_TYPE_IMAGE;
                                                                f.FILTER_IMAGE = this.getimagepath(request) + f.FILTER_IMAGE;
                                                            })
                                                            filterObj.filters = filteredArr;

                                                            if (filterObj.Type != "Asset Type") {
                                                                allFilters.push(filterObj);
                                                            }

                                                            filterObj = {};
                                                        }
                                                    })
                                                    finalFilterObj.allFilters = allFilters;
                                                    finalFilterObj.userPreferences = userPreferencesArr;
                                                    finalFilterObj.suggestions = sugestionsarr;
                                                    resolve(finalFilterObj)
                                                })
                                                .catch(err => {
                                                    reject(err)

                                                })
                                        })
                                })
                        })
                })
        })
    }
    static getFavAssets(user_email, host) {
        let assetsArray = [];
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.query(`select * from asset_details where asset_id in (select asset_id from asset_likes where LIKE_BY=:LIKE_BY)`, [user_email],
                {
                    outFormat: oracledb.OBJECT
                })
                .then(res => {
                    assetsArray = res
                    console.log('getFavAssets Length: ' + res.length)
                    this.refineAssets(request, 0, assetsArray.length, assetsArray, "createdDate", "desc", "", user_email).then(assets => {
                        resolve(assets);
                    })
                })
        })
    }
    static getFavAssets2(user_email, host) {
        let assetsArray = [];
        let likesArray = [];
        let viewsArray = [];
        let linksArray = [];
        let imagesArray = [];
        let allAssetsObj = {};
        let allAssetsFinalArray = [];
        let commentsArray = [];
        let allObj = {};
        let linkType = [];
        var lobj2 = {};
        let lobj = {};
        let linkObjArr = [];
        let solutionAreasArray = [];
        let solutionAreas = [];
        let assetTypes = [];
        let assetTypesArray = [];
        let salesPlays = [];
        let salesPlaysArray = [];
        let promotedArray = [];
        return new Promise((resolve, reject) => {
            const connection = getDb();
            connection.query(`select * from asset_details where asset_id in (select asset_id from asset_likes where LIKE_BY=:LIKE_BY)`, [user_email],
                {
                    outFormat: oracledb.OBJECT
                })
                .then(res => {
                    assetsArray = res
                    assetsArray.forEach(asset => {
                        asset.ASSET_THUMBNAIL = this.getimagepath(request) + asset.ASSET_THUMBNAIL;
                    })
                    connection.query(`select Count(*) comment_count,asset_id from 
                    asset_comments group by asset_id`, [],
                        {
                            outFormat: oracledb.OBJECT
                        })
                        .then(res => {
                            //console.log("comment count",res)
                            commentsArray = res;
                            connection.execute(`SELECT count(*) like_count,asset_id from ASSET_LIKES group by asset_id`, [],
                                {
                                    outFormat: oracledb.OBJECT
                                })
                                .then(res => {
                                    //console.log("LIKES",res)
                                    likesArray = res.rows;
                                    connection.execute(`SELECT * from ASSET_IMAGES`, {},
                                        {
                                            outFormat: oracledb.OBJECT
                                        }).then(res => {
                                            imagesArray = res.rows
                                            connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Solution Area'`, {},
                                                {
                                                    outFormat: oracledb.OBJECT
                                                })
                                                .then(res => {
                                                    solutionAreasArray = res.rows;
                                                    connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Asset Type'`, {},
                                                        {
                                                            outFormat: oracledb.OBJECT
                                                        })
                                                        .then(res => {
                                                            assetTypesArray = res.rows;
                                                            connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Sales Initiatives'`, {},
                                                                {
                                                                    outFormat: oracledb.OBJECT
                                                                })
                                                                .then(res => {
                                                                    salesPlaysArray = res.rows;
                                                                    connection.execute(`SELECT asset_id from ASSET_LOB_LEADER_PROMOTED_ASSETS where status=1`, [],
                                                                        {
                                                                            outFormat: oracledb.OBJECT
                                                                        })
                                                                        .then(res => {
                                                                            promotedArray = res.rows;
                                                                            connection.execute(`SELECT * from ASSET_LINKS`, {},
                                                                                {
                                                                                    outFormat: oracledb.OBJECT
                                                                                }).then(res => {
                                                                                    linksArray = res.rows
                                                                                    connection.execute(`SELECT count(*) view_count,asset_id from ASSET_VIEWS group by asset_id`, [],
                                                                                        {
                                                                                            outFormat: oracledb.OBJECT
                                                                                        })
                                                                                        .then(res => {
                                                                                            viewsArray = res.rows
                                                                                            //console.log("All Arrays",assetsArray,likesArray,viewsArray)
                                                                                            assetsArray.forEach(asset => {
                                                                                                allAssetsObj = asset;
                                                                                                allAssetsObj.createdDate = allAssetsObj.ASSET_CREATED_DATE;
                                                                                                const id = asset.ASSET_ID;
                                                                                                allAssetsObj.LINKS = [];
                                                                                                var links = linksArray.filter(link => link.ASSET_ID === id)
                                                                                                ////console.log('links:',links)
                                                                                                solutionAreas = solutionAreasArray.filter(s => s.ASSET_ID === id);
                                                                                                allAssetsObj.SOLUTION_AREAS = solutionAreas;
                                                                                                assetTypes = assetTypesArray.filter(s => s.ASSET_ID === id);
                                                                                                allAssetsObj.ASSET_TYPE = assetTypes;
                                                                                                salesPlays = salesPlaysArray.filter(s => s.ASSET_ID === id);
                                                                                                allAssetsObj.SALES_PLAY = salesPlays;
                                                                                                linkType = links.map(a => a.LINK_REPOS_TYPE)
                                                                                                linkType = [...new Set(linkType)]
                                                                                                let promote = promotedArray.filter(s => s.ASSET_ID === id);
                                                                                                allAssetsObj.PROMOTE = promote.length == 0 ? false : true;
                                                                                                ////console.log(linkType)
                                                                                                linkType.forEach(type => {
                                                                                                    var links2 = linksArray.filter(link => link.LINK_REPOS_TYPE === type && link.ASSET_ID === id)
                                                                                                    lobj.TYPE = type;
                                                                                                    lobj.arr = links2;
                                                                                                    lobj2 = lobj
                                                                                                    linkObjArr.push(lobj2);
                                                                                                    lobj = {}
                                                                                                })
                                                                                                allAssetsObj.LINKS = linkObjArr;

                                                                                                linkObjArr = [];
                                                                                                ////console.log(lobj2,"obj2")
                                                                                                var images = imagesArray.filter(image => image.ASSET_ID === id);
                                                                                                allAssetsObj.IMAGES = images;
                                                                                                var likes = likesArray.filter(l => l.ASSET_ID === id)
                                                                                                var comments = commentsArray.filter(c => c.ASSET_ID === id)
                                                                                                var views = viewsArray.filter(v => v.ASSET_ID === id)
                                                                                                if (!comments.length) {
                                                                                                    comments.push({ COMMENT_COUNT: 0 });
                                                                                                }
                                                                                                if (!likes.length) {
                                                                                                    likes.push({ LIKE_COUNT: 0, ASSET_ID: id })
                                                                                                }
                                                                                                if (!views.length) {
                                                                                                    views.push({ VIEW_COUNT: 0, ASSET_ID: id })
                                                                                                }
                                                                                                allAssetsObj.LIKES = likes[0];
                                                                                                allAssetsObj.VIEWS = views[0];
                                                                                                allAssetsObj.COMMENTS = comments[0];
                                                                                                //console.log(allAssetsObj)
                                                                                                allAssetsFinalArray.push(allAssetsObj)
                                                                                                allAssetsObj = {};
                                                                                            })
                                                                                            allObj.TOTALCOUNT = allAssetsFinalArray.length;
                                                                                            allObj.ASSETS = allAssetsFinalArray;
                                                                                            resolve(allObj)
                                                                                        })
                                                                                })
                                                                        })
                                                                })
                                                        })
                                                })
                                        })
                                })
                        })
                })
        })
    }
    static getAssetsByLob(lob, request, user_email, sortBy, order) {
        let assetsArray = [];

        return new Promise((resolve, reject) => {
            const connection = getDb();
            let lobQuerySql;
            let lobQueryOptions;
            let promoteQuerySql;
            let promoteQueryOptions;
            if (lob !== 'Others') {
                lobQuerySql = `select * from asset_details where asset_id in (select asset_id from asset_lob_asset_map where lob_id in (select lob_id from asset_lobs where lob_name=:LOB_NAME or lob_name='Others')) and asset_status='Live'`
                lobQueryOptions = [lob]
                promoteQuerySql = `SELECT asset_id from ASSET_LOB_LEADER_PROMOTED_ASSETS where status=1 and (LOB_LEADER_LOB=:LOB_NAME or LOB_LEADER_LOB='Others')`
                promoteQueryOptions = [lob];
            }
            else {
                lobQuerySql = `select * from asset_details where asset_id in (select distinct asset_id from asset_lob_asset_map) and asset_status='Live'`;
                lobQueryOptions = [];
                promoteQuerySql = `SELECT asset_id from ASSET_LOB_LEADER_PROMOTED_ASSETS where status=1`
                promoteQueryOptions = [];
            }
            connection.query(lobQuerySql, lobQueryOptions,
                {
                    outFormat: oracledb.OBJECT
                })
                .then(res => {
                    assetsArray = res;
                    // assetsArray.forEach(asset => {
                    //     asset.ASSET_THUMBNAIL = 'https://' + host + '/' + asset.ASSET_THUMBNAIL;
                    // })
                    this.refineAssets(request, 0, assetsArray.length, assetsArray, sortBy, order, "", user_email).then(assets => {
                        resolve(assets);
                    })
                })
        })
    }

    static getAssetsByLob2(lob, host) {
        let assetsArray = [];
        let likesArray = [];
        let viewsArray = [];
        let linksArray = [];
        let imagesArray = [];
        let allAssetsObj = {};
        let allAssetsFinalArray = [];
        let commentsArray = [];
        let allObj = {};
        let linkType = [];
        var lobj2 = {};
        let lobj = {};
        let linkObjArr = [];
        let solutionAreasArray = [];
        let solutionAreas = [];
        let assetTypes = [];
        let assetTypesArray = [];
        let salesPlays = [];
        let salesPlaysArray = [];
        let promotedArray = [];
        let industryArray = []
        let industry = [];
        return new Promise((resolve, reject) => {
            const connection = getDb();
            let lobQuerySql;
            let lobQueryOptions;
            let promoteQuerySql;
            let promoteQueryOptions;
            if (lob !== 'Others') {
                lobQuerySql = `select * from asset_details where asset_id in (select asset_id from asset_lob_asset_map where lob_id in (select lob_id from asset_lobs where lob_name=:LOB_NAME or lob_name='Others')) and asset_status='Live'`
                lobQueryOptions = [lob]
                promoteQuerySql = `SELECT asset_id from ASSET_LOB_LEADER_PROMOTED_ASSETS where status=1 and (LOB_LEADER_LOB=:LOB_NAME or LOB_LEADER_LOB='Others')`
                promoteQueryOptions = [lob];
            }
            else {
                lobQuerySql = `select * from asset_details where asset_id in (select distinct asset_id from asset_lob_asset_map) and asset_status='Live'`;
                lobQueryOptions = [];
                promoteQuerySql = `SELECT asset_id from ASSET_LOB_LEADER_PROMOTED_ASSETS where status=1`
                promoteQueryOptions = [];
            }
            connection.query(lobQuerySql, lobQueryOptions,
                {
                    outFormat: oracledb.OBJECT
                })
                .then(res => {
                    assetsArray = res
                    assetsArray.forEach(asset => {
                        asset.ASSET_THUMBNAIL = this.getimagepath(request) + asset.ASSET_THUMBNAIL;
                    })
                    connection.query(`select Count(*) comment_count,asset_id from 
                    asset_comments group by asset_id`, [],
                        {
                            outFormat: oracledb.OBJECT
                        })
                        .then(res => {
                            //console.log("comment count",res)
                            commentsArray = res;
                            connection.execute(`SELECT count(*) like_count,asset_id from ASSET_LIKES group by asset_id`, [],
                                {
                                    outFormat: oracledb.OBJECT
                                })
                                .then(res => {
                                    //console.log("LIKES",res)
                                    likesArray = res.rows;
                                    connection.execute(`SELECT * from ASSET_IMAGES`, {},
                                        {
                                            outFormat: oracledb.OBJECT
                                        }).then(res => {
                                            imagesArray = res.rows
                                            connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Solution Area'`, {},
                                                {
                                                    outFormat: oracledb.OBJECT
                                                })
                                                .then(res => {
                                                    solutionAreasArray = res.rows;
                                                    connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Asset Type'`, {},
                                                        {
                                                            outFormat: oracledb.OBJECT
                                                        })
                                                        .then(res => {
                                                            assetTypesArray = res.rows;

                                                            connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Industry'`, {},
                                                                {
                                                                    outFormat: oracledb.OBJECT
                                                                })
                                                                .then(res => {
                                                                    industryArray = res.rows;
                                                                    connection.execute(`select m.filter_id,f.filter_name,m.asset_id from asset_filter_asset_map m join asset_filter f on (m.filter_id=f.filter_id) where filter_type='Sales Initiatives'`, {},
                                                                        {
                                                                            outFormat: oracledb.OBJECT
                                                                        })
                                                                        .then(res => {
                                                                            salesPlaysArray = res.rows;
                                                                            connection.execute(`SELECT * from ASSET_LINKS`, {},
                                                                                {
                                                                                    outFormat: oracledb.OBJECT
                                                                                }).then(res => {
                                                                                    linksArray = res.rows
                                                                                    connection.query(promoteQuerySql, promoteQueryOptions,
                                                                                        {
                                                                                            outFormat: oracledb.OBJECT
                                                                                        })
                                                                                        .then(res => {
                                                                                            promotedArray = res;
                                                                                            connection.execute(`SELECT count(*) view_count,asset_id from ASSET_VIEWS group by asset_id`, [],
                                                                                                {
                                                                                                    outFormat: oracledb.OBJECT
                                                                                                })
                                                                                                .then(res => {
                                                                                                    viewsArray = res.rows
                                                                                                    //console.log("All Arrays",assetsArray,likesArray,viewsArray)
                                                                                                    assetsArray.forEach(asset => {
                                                                                                        allAssetsObj = asset;
                                                                                                        const id = asset.ASSET_ID;
                                                                                                        allAssetsObj.createdDate = allAssetsObj.ASSET_CREATED_DATE;
                                                                                                        allAssetsObj.LINKS = [];
                                                                                                        var links = linksArray.filter(link => link.ASSET_ID === id);
                                                                                                        solutionAreas = solutionAreasArray.filter(s => s.ASSET_ID === id);
                                                                                                        allAssetsObj.SOLUTION_AREAS = solutionAreas;
                                                                                                        industry = industryArray.filter(s => s.ASSET_ID === id);
                                                                                                        allAssetsObj.INDUSTRY = industry;
                                                                                                        assetTypes = assetTypesArray.filter(s => s.ASSET_ID === id);
                                                                                                        allAssetsObj.ASSET_TYPE = assetTypes;
                                                                                                        salesPlays = salesPlaysArray.filter(s => s.ASSET_ID === id);
                                                                                                        allAssetsObj.SALES_PLAY = salesPlays;
                                                                                                        let promote = promotedArray.filter(s => s.ASSET_ID === id);
                                                                                                        allAssetsObj.PROMOTE = promote.length == 0 ? false : true;
                                                                                                        linkType = links.map(a => a.LINK_REPOS_TYPE)
                                                                                                        linkType = [...new Set(linkType)]
                                                                                                        linkType.forEach(type => {
                                                                                                            var links2 = linksArray.filter(link => link.LINK_REPOS_TYPE === type && link.ASSET_ID === id)
                                                                                                            lobj.TYPE = type;
                                                                                                            lobj.arr = links2;
                                                                                                            lobj2 = lobj
                                                                                                            linkObjArr.push(lobj2);
                                                                                                            lobj = {}
                                                                                                        })
                                                                                                        allAssetsObj.LINKS = linkObjArr;

                                                                                                        linkObjArr = [];
                                                                                                        ////console.log(lobj2,"obj2")
                                                                                                        var images = imagesArray.filter(image => image.ASSET_ID === id);
                                                                                                        allAssetsObj.IMAGES = images;
                                                                                                        var likes = likesArray.filter(l => l.ASSET_ID === id)
                                                                                                        var comments = commentsArray.filter(c => c.ASSET_ID === id)
                                                                                                        var views = viewsArray.filter(v => v.ASSET_ID === id)
                                                                                                        if (!comments.length) {
                                                                                                            comments.push({ COMMENT_COUNT: 0 });
                                                                                                        }
                                                                                                        if (!likes.length) {
                                                                                                            likes.push({ LIKE_COUNT: 0, ASSET_ID: id })
                                                                                                        }
                                                                                                        if (!views.length) {
                                                                                                            views.push({ VIEW_COUNT: 0, ASSET_ID: id })
                                                                                                        }
                                                                                                        allAssetsObj.LIKES = likes[0];
                                                                                                        allAssetsObj.VIEWS = views[0];
                                                                                                        allAssetsObj.COMMENTS = comments[0];
                                                                                                        //console.log(allAssetsObj)
                                                                                                        allAssetsFinalArray.push(allAssetsObj)
                                                                                                        allAssetsObj = {};
                                                                                                    })
                                                                                                    allObj.TOTALCOUNT = allAssetsFinalArray.length;
                                                                                                    allObj.ASSETS = allAssetsFinalArray;
                                                                                                    resolve(allObj)
                                                                                                })
                                                                                        })
                                                                                })
                                                                        })
                                                                })
                                                        })
                                                })
                                        })
                                })
                        })
                })
        })
    }

    static getMyAssets(user_email, request) {
        let assetsArray = [];
        let likesArray = [];
        let viewsArray = [];
        let allAssetsObj = {};
        let allAssetsFinalArray = [];
        let commentsArray = [];
        let statusArr = [];
        let filteredAssetsArray = [];
        let statusObj = {};
        let finalArr = [];
        let allStatusList = ['Saved', 'Pending Review', 'Live', 'Pending Rectification', 'Reject'];
        let tempStatusArr = [];
        return new Promise((resolve, reject) => {
            const connection = getDb();
            let sql = `select a.*,c.filter_name as ASSET_TYPE,c.filter_id as ASSET_TYPE_ID from asset_details a,asset_filter_asset_map b, asset_tags c 
            where a.ASSET_OWNER='${user_email}' and a.asset_id=b.asset_id
            and b.filter_id=c.filter_id and c.filter_id in(select filter_id from asset_tags where filter_parent_id='goek85ttc43')`;
            console.log("Query: : : " + sql);
            connection.query(sql, {},
                {
                    outFormat: oracledb.OBJECT
                })
                .then(res => {
                    res.forEach(element => {
                        element.ASSET_REVIEW_NOTE = JSON.parse(element.ASSET_REVIEW_NOTE)

                    });
                    assetsArray = res;
                    console.log("My Asset count >>>>>>>>>>>> " + assetsArray.length);
                    assetsArray.forEach(asset => {
                        // asset.ASSET_THUMBNAIL = 'https://' + host + this.getimagepath(request.protocol)+ '/' + asset.ASSET_THUMBNAIL;

                        asset.ASSET_THUMBNAIL = asset.ASSET_THUMBNAIL != null && asset.ASSET_THUMBNAIL.trim().length > 0 ? this.getimagepath(request) + asset.ASSET_THUMBNAIL : this.getimagepath(request) + 'no_image.png';
                    })
                    connection.query(`select Count(*) comment_count,asset_id from 
                    asset_comments group by asset_id`, [],
                        {
                            outFormat: oracledb.OBJECT
                        })
                        .then(res => {
                            //console.log("comment count",res)
                            commentsArray = res;
                            connection.execute(`SELECT count(*) like_count,asset_id from ASSET_LIKES group by asset_id`, [],
                                {
                                    outFormat: oracledb.OBJECT
                                })
                                .then(res => {
                                    //console.log("LIKES",res)
                                    likesArray = res.rows;
                                    connection.execute(`SELECT count(*) view_count,asset_id from ASSET_VIEWS group by asset_id`, [],
                                        {
                                            outFormat: oracledb.OBJECT
                                        })
                                        .then(res => {
                                            viewsArray = res.rows

                                            statusArr = assetsArray.map(a => a.ASSET_STATUS)
                                            statusArr = [...new Set(statusArr)];

                                            //console.log("status Array",statusArr)

                                            tempStatusArr = allStatusList.filter(s => statusArr.indexOf(s) === -1)
                                            //console.log("temp status arr", tempStatusArr)



                                            statusArr = [...statusArr, ...tempStatusArr]

                                            statusArr = [...new Set(statusArr)];

                                            //console.log("updated status arr", statusArr)

                                            statusArr.forEach(status => {                                                             //loop each asset status type
                                                //console.log(status)
                                                filteredAssetsArray = assetsArray.filter(a => a.ASSET_STATUS === status)
                                                statusObj.status = status;
                                                //console.log("filteredAssetsArray", filteredAssetsArray) 
                                                filteredAssetsArray.forEach(asset => {           //loop each asset for current status type
                                                    allAssetsObj = asset;
                                                    const id = asset.ASSET_ID;
                                                    var likes = likesArray.filter(l => l.ASSET_ID === id)
                                                    var comments = commentsArray.filter(c => c.ASSET_ID === id)
                                                    var views = viewsArray.filter(v => v.ASSET_ID === id)
                                                    if (!comments.length) {
                                                        comments.push({ COMMENT_COUNT: 0 });
                                                    }
                                                    if (!likes.length) {
                                                        likes.push({ LIKE_COUNT: 0, ASSET_ID: id })
                                                    }
                                                    if (!views.length) {
                                                        views.push({ VIEW_COUNT: 0, ASSET_ID: id })
                                                    }
                                                    allAssetsObj.LIKES = likes[0];
                                                    allAssetsObj.VIEWS = views[0];
                                                    allAssetsObj.COMMENTS = comments[0];
                                                    allAssetsFinalArray.push(allAssetsObj)
                                                    allAssetsObj = {};
                                                })
                                                statusObj.arr = allAssetsFinalArray;
                                                allAssetsFinalArray = [];
                                                finalArr.push(statusObj)
                                                statusObj = {};
                                            })

                                            resolve(finalArr)
                                        })
                                })
                        })
                })
        })
    }


    static getLocations() {
        return new Promise((resolve, reject) => {
            let dataObj = {};
            let pillarObj = {};
            let pillarArr = [];
            const connection = getDb();
            connection.query(`select HUB_NAME from asset_hub`, {},
                {
                    outFormat: oracledb.OBJECT
                })
                .then(res => {
                    dataObj.locations = res
                    connection.query(`select filter_name from asset_filter where filter_type='Solution Area'`, {},
                        {
                            outFormat: oracledb.OBJECT
                        }).then(res => {
                            res.forEach(p => {
                                pillarObj.PILLAR_NAME = p.FILTER_NAME
                                pillarArr.push(pillarObj)
                                pillarObj = {};

                            })
                            dataObj.pillars = pillarArr
                            connection.query(`select LOB_ID,LOB_NAME from ASSET_LOBS`, {},
                                {
                                    outFormat: oracledb.OBJECT
                                })
                                .then(result => {
                                    dataObj.lobs = result
                                    resolve(dataObj)
                                })
                        })

                })
        })

    }


    static addUserPreference(user_name, user_email, filters, action) {
        let filterObj = {};
        let filterArr = [];
        // //console.log(filters)
        return new Promise((resolve, reject) => {
            if (filters.length !== 0) {
                filters.forEach(f => {
                    filterObj.USER_NAME = user_name;
                    filterObj.USER_EMAIL = user_email;
                    filterObj.ASSET_FILTER_ID = f;
                    filterArr.push(filterObj)
                    filterObj = {};
                })
            }
            const connection = getDb();

            connection.execute(`DELETE from ASSET_PREFERENCES WHERE USER_EMAIL=:USER_EMAIL`, [user_email],
                {
                    autoCommit: true,
                    outFormat: oracledb.Object
                })
                .then(res => {
                    if (filters.length === 0) {
                        resolve({ status: "Preference Registered successfully" })
                    }

                    connection.batchInsert(`INSERT into ASSET_PREFERENCES(USER_NAME,USER_EMAIL,ASSET_FILTER_ID) values(:USER_NAME,:USER_EMAIL,:ASSET_FILTER_ID)`,
                        filterArr,
                        {
                            outFormat: oracledb.OBJECT,
                            autoCommit: true,
                        })
                        .then(res => {
                            resolve({ status: "Preferences Registered successfully" })
                        })
                })
        })

    }

    static savefeedback(email, assetid, feedback, res) {
        const connection = getDb();
        let saveFeedbackSql = `insert into asset_feedback (FEEDBACK_RESPONSE,ASSET_ID,FEEDBACK_BY,FEEDBACK_CREATEDON) values(:0,:1,:2,:3)`;
        let saveFeedbackOptions = [feedback, assetid, email, new Date()];

        connection.execute(saveFeedbackSql, saveFeedbackOptions, {
            autoCommit: true
        }).then(result => {
            if (result.rowsAffected === 0) {
                //console.log("Could not capture feedback. . .");
                res.status(404).json({ status: "FAILED", msg: "Could not capture feedback " });
            } else {
                //console.log("feedback is captured. . .");
                res.json({ status: "feedback saved successfully" })
            }

        }).catch(err => {
            //console.log("Error occurred while saving feedback : " + JSON.stringify(err));
            res.status(500).json({ status: "feedback captured failed", msg: JSON.stringify(err) })
        })
    }
    static getHelpAndSupportModal() {
        const connection = getDb();
        return new Promise((resolve, reject) => {
            connection.query(`select * from ASSET_HELP_SUPPORT`, {},
                {
                    outFormat: oracledb.OBJECT
                })
                .then(result => {
                    //console.log(result)
                    resolve(result)
                }).catch(err => {
                    console.log(err)
                })
        })
    }
    static SaveHelpAndSupportModal(data, res) {
        const connection = getDb();
        return new Promise((resolve, reject) => {
            var sql = `UPDATE ASSET_HELP_SUPPORT 
        SET PROMO_VIDEO_URL=:PROMO_VIDEO_URL, PROMO_CONTENT=:PROMO_CONTENT,USER_GUIDE=:USER_GUIDE,USER_GUIDE_URL=:USER_GUIDE_URL
         WHERE  ITEM_ID=:ITEM_ID`;
            var options = [data.promo_video_url, data.promo_content, data.user_guide, data.user_guide_url, 1];
            connection.update(sql, options,
                {
                    outFormat: oracledb.Object,
                    autoCommit: true
                })
                .then(result => {
                    if (result.rowsAffected === 0) {
                        //console.log("Could not capture feedback. . .");
                        resolve({ status: "FAILED", msg: "Could not capture promo content " });
                    } else {
                        //console.log("feedback is captured. . .");
                        resolve({ status: "Promo content updated successfully" });
                    }

                })
                .catch(err => {
                    //console.log(err)
                    resolve({ status: "promo content captured failed", msg: JSON.stringify(err) })
                })
        })
    }

}