const getDb = require('../database/db').getDb;
var uniqid = require('uniqid');
const oracledb = require('oracledb');
const path = require('path');
let base64 = require('base-64');
let fs = require('fs');

saveFilterImage = (host, image, FILTER_TYPE, FILTER_ID, res) => {
    // READ THE IMAGE EXTENSION
    let imageext = image.split(';base64,')[0].split('/')[1];
    let dynamicPath = 'filter';
    // READ THE BASE64 IMAGE DATA FROM THE PAYLOAD
    image = image.split(';base64,').pop();
    console.log('Uploading img');
    let filename = base64.encode(FILTER_ID + FILTER_TYPE) + "." + imageext;
    let foldername = "filter";
    let filelocation = path.join(__dirname, '../../../..', 'mnt/ahfs', '/' + foldername + '/');
    //let filelocation = path.join(__dirname, '/mnt/ahfs', 'private', '/filter/');
    savefileto(image, filelocation + filename).then((data) => {
        const connection = getDb();
        let updateFilterImageSql = '';
        let relativepath = foldername + "/" + filename;
        //let updateProfileImageSql = "update ASSET_FILTER SET FILTER_IMAGE='" + relativepath + "', where FILTER_ID='" + FILTER_ID + "'";//"update ASSET_USER SET user_profile_image=:0 where user_email=:1";

        if (FILTER_ID)
            updateFilterImageSql = "update ASSET_FILTER SET FILTER_IMAGE='" + relativepath + "' where FILTER_ID='" + FILTER_ID + "'";//"update ASSET_FILTER set FILTER_IMAGE=:0 where FILTER_ID=:1";
        else
            updateFilterImageSql = "update ASSET_FILTER SET FILTER_TYPE_IMAGE='" + relativepath + "' where FILTER_TYPE='" + FILTER_TYPE + "'";//"update ASSET_FILTER set FILTER_IMAGE_TYPE=:0 where FILTER_ID=:1";
        //let updateFilterImageOptions = [`/filter/${filename}`, FILTER_ID];
        console.log(updateFilterImageSql);
        connection.update(updateFilterImageSql, [], {
            autoCommit: true
        }).then(result => {
            if (result.rowsAffected > 0) {
                console.log("Filter Image updated successfully ");
            } else {
                console.log("Could not found Image. . .");
            }
        }).catch(err => {
            console.log("Error occurred while saving Thumbnail image : " + err);
        })
    }).catch(err => {
        console.log("Error while Filter image save " + err);
    })
}

savefileto = (base64Image, filelocation) => {
    console.log("Saving Filter image : " + base64Image.length + " - " + filelocation);
    return new Promise((resolve, reject) => {
        try {
            fs.writeFileSync(filelocation, base64Image, { encoding: 'base64', mode: 0o755 });
            console.log("Image saved");
            resolve("Success");
        } catch (err) {
            console.log("Image save failed : : " + JSON.stringify(err));
        }
    });
}
exports.addNewFilter = (filter, host) => {
    //console.log('addNewFilter request data: ' + JSON.stringify(filter));
    const connection = getDb();
    return new Promise((resolve, reject) => {
        if (filter.child_filter.length > 0) {
            filter.child_filter.forEach(item => {
                let newFilterId = uniqid.process();
                let sql = '';
                let options = '';
                if (filter.existingFilter == 1) {
                    sql = `INSERT into ASSET_FILTER(FILTER_ID,FILTER_NAME,FILTER_TYPE,FILTER_TYPE_IMAGE,FILTER_TYPE_L2,FILTER_STATUS)  values(:0,:1,:2,:3,:4,:5)`;
                    options = [newFilterId, item.filter_name, filter.filter_type, filter.filter_type_image, item.filter_type_l2, 1]
                } else {
                    sql = `INSERT into ASSET_FILTER(FILTER_ID,FILTER_NAME,FILTER_TYPE,FILTER_TYPE_L2,FILTER_STATUS)  values(:0,:1,:2,:3,:4)`;
                    options = [newFilterId, item.filter_name, filter.filter_type, item.filter_type_l2, 1]
                }
                //let sql1 = 'SELECT TOP 1 ASSET_FILTER.FILTER_NAME, ASSET_FILTER.FILTER_TYPE FROM ASSET_FILTER WHEREASSET_FILTER.FILTER_NAME, ASSET_FILTER.FILTER_TYPE;'
                connection.execute(sql, options,
                    {
                        outFormat: oracledb.Object,
                        autoCommit: true
                    })
                    .then(res => {
                        console.log('filter added');
                        if (item.filter_image.length > 0) {
                            saveFilterImage(host, item.filter_image, filter.filter_type, newFilterId, res);
                        }
                        if (filter.existingFilter != 1 && filter.filter_type_image.length > 0) {
                            saveFilterImage(host, filter.filter_type_image, filter.filter_type, '', res);
                        }
                        resolve({ "status": 'Success', "message": "filter added successfully" });
                    })
                    .catch(err => {
                        console.log("View error: " + err);
                        resolve(err)
                    })
            });
        } else {
            resolve('Please provide filter name');
        }
    })
}
exports.editFilterbyId = (filter, host) => {
    // console.log('addNewFilter request data: ' + filter.child_filter.length);
    const connection = getDb();
    return new Promise((resolve, reject) => {
        console.log('old_filter_type' in filter);
        if (filter.old_filter_type) {
            connection.execute(`UPDATE ASSET_FILTER SET FILTER_TYPE=:FILTER_TYPE WHERE FILTER_TYPE=:OLD_FILTER_TYPE`, [filter.filter_type, filter.old_filter_type],
                {
                    outFormat: oracledb.Object,
                    autoCommit: true
                })
                .then(res => {
                    if (filter.filter_type_image.length > 0) {
                        saveFilterImage(host, filter.filter_type_image, filter.filter_type, '', res);
                    }
                    resolve({ "status": 'Success', "message": "Filter updated successfully" })
                })
                .catch(err => {
                    console.log("View error: " + err);
                    resolve(err)
                })
        }
        if (filter.child_filter.length > 0) {
            filter.child_filter.forEach(item => {
                connection.execute(`UPDATE ASSET_FILTER SET FILTER_NAME=:FILTER_NAME,FILTER_TYPE=:FILTER_TYPE,FILTER_TYPE_L2=:FILTER_TYPE_L2 WHERE FILTER_ID=:FILTER_ID`, [item.filter_name, filter.filter_type, filter.filter_type_l2, item.filter_id],
                    {
                        outFormat: oracledb.Object,
                        autoCommit: true
                    })
                    .then(res => {

                        if (item.filter_image.length > 0) {
                            saveFilterImage(host, item.filter_image, filter.filter_type, item.filter_id, res);
                        }
                        resolve({ "status": 'Success', "message": "Filter updated successfully" })
                    })
                    .catch(err => {
                        console.log("View error: " + err);
                        resolve(err)
                    })
            })
        } else {
            resolve('Please provide filter name');
        }

    })
}
exports.deleteFilterbyId = (filterId, host) => {
    const connection = getDb();
    return new Promise((resolve, reject) => {
        connection.execute(`DELETE from ASSET_FILTER_ASSET_MAP where FILTER_ID=:FILTER_ID `, [filterId],
            {
                outFormat: oracledb.Object,
                autoCommit: true
            })
            .then(res => {
                //resolve({ "status": "filter deleted" })
                connection.execute(`DELETE from ASSET_WINSTORY_FILTER_WINSTORY_MAP where FILTER_ID=:FILTER_ID`, [filterId],
                    {
                        outFormat: oracledb.Object,
                        autoCommit: true
                    })
                    .then(res => {
                        connection.execute(`DELETE from ASSET_FILTER where FILTER_ID=:FILTER_ID`, [filterId],
                            {
                                outFormat: oracledb.Object,
                                autoCommit: true
                            })
                            .then(res => {
                                //resolve({ "status": "filter deleted" })
                                resolve({ "status": 'Success', "message": "Filter deleted successfully" })
                            })
                            .catch(err => {
                                console.log("ASSET_FILTER View error: " + err);
                                resolve(err)
                            })
                    })
                    .catch(err => {
                        console.log("ASSET_WINSTORY_FILTER_WINSTORY_MAP View error: " + err);
                        resolve(err)
                    })
            })
            .catch(err => {
                console.log("ASSET_FILTER_ASSET_MAP View error: " + err);
                resolve(err)
            })
    })
}
exports.mapFilters = (filter, host) => {
    const connection = getDb();
    return new Promise((resolve, reject) => {
        if (filter.assets.length > 0) {
            filter.assets.forEach(item => {
                console.log(item);
                let newId = uniqid.process();
                connection.execute(`Select * from ASSET_FILTER_ASSET_MAP where FILTER_ID=:FILTER_ID AND ASSET_ID=:assetid`, [filter.filterId, item],
                    {
                        outFormat: oracledb.Object,
                        //autoCommit: true
                    })
                    .then(res => {
                        if (res.rows.length == 0) {
                            connection.execute(`INSERT into ASSET_FILTER_ASSET_MAP(FILTER_ASSET_MAP_ID,FILTER_ID,ASSET_ID)  values(:0,:1,:2)`, [newId, filter.filterId, item],
                                {
                                    outFormat: oracledb.Object,
                                    autoCommit: true
                                })
                                .then(res => {
                                    if (res.rowsAffected > 0) {
                                        connection.execute(`UPDATE ASSET_FILTER SET FILTER_STATUS=:FILTER_STATUS  WHERE FILTER_ID=:FILTER_ID`, [1, filter.filterId],
                                            {
                                                outFormat: oracledb.Object,
                                                autoCommit: true
                                            })
                                            .then(res => {
                                                //resolve({ "status": "filter mapped" })
                                                resolve({ "status": 'Success', "message": "Filter mapped successfully" })
                                            })
                                            .catch(err => {
                                                console.log("ASSET_FILTER View error: " + err);
                                                resolve(err)
                                            })
                                    }
                                    //resolve({ "status": "filter mapped with asset" })

                                })
                                .catch(err => {
                                    console.log("ASSET_FILTER View error: " + err);
                                    resolve(err)
                                })
                        }
                    })
                    .catch(err => {
                        console.log("ASSET_FILTER_ASSET_MAP View error: " + err);
                        resolve(err)
                    })
            })
        }
        if (filter.wins.length > 0) {
            filter.wins.forEach(item => {
                let newId = uniqid.process();
                connection.execute(`Select * from ASSET_WINSTORY_FILTER_WINSTORY_MAP where FILTER_ID=:FILTER_ID AND WINSTORY_ID=:WINSTORY_ID`, [filter.filterId, item],
                    {
                        outFormat: oracledb.Object,
                        //autoCommit: true
                    })
                    .then(res => {
                        if (res.rows.length == 0) {
                            connection.execute(`INSERT into ASSET_WINSTORY_FILTER_WINSTORY_MAP(FILTER_ASSET_MAP_ID,FILTER_ID,WINSTORY_ID)  values(:0,:1,:2)`, [newId, filter.filterId, item],
                                {
                                    outFormat: oracledb.Object,
                                    autoCommit: true
                                })
                                .then(res => {
                                    if (res.rowsAffected > 0) {
                                        connection.execute(`UPDATE ASSET_FILTER SET FILTER_STATUS=:FILTER_STATUS  WHERE FILTER_ID=:FILTER_ID`, [1, filter.filterId],
                                            {
                                                outFormat: oracledb.Object,
                                                autoCommit: true
                                            })
                                            .then(res => {
                                                //resolve({ "status": "filter mapped" })
                                                resolve({ "status": 'Success', "message": "Filter mapped successfully" })
                                            })
                                            .catch(err => {
                                                console.log("ASSET_FILTER View error: " + err);
                                                resolve(err)
                                            })
                                    }

                                })
                                .catch(err => {
                                    console.log("ASSET_FILTER View error: " + err);
                                    resolve(err)
                                })
                        }
                    })
                    .catch(err => {
                        console.log("ASSET_WINSTORY_FILTER_WINSTORY_MAP View error: " + err);
                        resolve(err)
                    })
            })

        }
    })
}
exports.unMapFilters = (filterId) => {
    const connection = getDb();
    return new Promise((resolve, reject) => {
        connection.execute(`DELETE FROM ASSET_FILTER_ASSET_MAP where FILTER_ID=:FILTER_ID `, [filterId],
            {
                outFormat: oracledb.Object,
                autoCommit: true
            })
            .then(res => {
                //resolve({ "status": "filter deleted" })
                connection.execute(`DELETE FROM ASSET_WINSTORY_FILTER_WINSTORY_MAP where FILTER_ID=:FILTER_ID`, [filterId],
                    {
                        outFormat: oracledb.Object,
                        autoCommit: true
                    })
                    .then(res => {
                        resolve({ "status": "filter unmapped" })
                        connection.execute(`UPDATE ASSET_FILTER SET FILTER_STATUS=:FILTER_STATUS  WHERE FILTER_ID=:FILTER_ID`, [0, filterId],
                            {
                                outFormat: oracledb.Object,
                                autoCommit: true
                            })
                            .then(res => {
                                //resolve({ "status": "filter mapped" })
                                resolve({ "status": 'Success', "message": "Filter unmapped successfully" })
                            })
                            .catch(err => {
                                console.log("ASSET_FILTER View error: " + err);
                                resolve(err)
                            })
                        //resolve({ "status": 'Success', "message": "Filter unmapped successfully" })
                    })
                    .catch(err => {
                        console.log("ASSET_WINSTORY_FILTER_WINSTORY_MAP View error: " + err);
                        resolve(err)
                    })
            })
            .catch(err => {
                console.log("ASSET_FILTER_ASSET_MAP View error: " + err);
                resolve(err)
            })
    })
}
exports.reMapFilters = (data) => {
    const connection = getDb();
    return new Promise((resolve, reject) => {
        if (data.filter_id && data.new_filter_id) {
            connection.execute(`SELECT asset_id FROM ASSET_FILTER_ASSET_MAP where FILTER_ID=:FILTER_ID`, [data.filter_id],
                {
                    outFormat: oracledb.Object,
                    autoCommit: true
                })
                .then(res => {
                    console.log(JSON.stringify(res));
                    if (res.rows.length > 0) {
                        let binddata = [];
                        //console.log("Filter map is in progress :" + JSON.stringify(data.filter_id));
                        // CREATE BIND VARIABLES
                        res.rows.map(val => {
                            console.log(val[0]);
                            let newId = uniqid.process();
                            let values = [];
                            values.push(newId);
                            values.push(val[0]);
                            values.push(data.new_filter_id);
                            binddata.push(values);
                        });

                        console.log(JSON.stringify(binddata));
                        let createLinksSql = `Insert into ASSET_FILTER_ASSET_MAP (FILTER_ASSET_MAP_ID,FILTER_ID,ASSET_ID) values (:0,:1,:2)`;
                        let options = {
                            autoCommit: true,   // autocommit if there are no batch errors
                            batchErrors: true,  // identify invalid records; start a transaction for valid ones
                            bindDefs: [         // describes the data in 'binds'
                                { type: oracledb.STRING, maxSize: 20 },
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
                                //resolve(result);
                                connection.execute(`UPDATE ASSET_FILTER SET FILTER_STATUS=:FILTER_STATUS  WHERE FILTER_ID=:FILTER_ID`, [1, data.new_filter_id],
                                    {
                                        outFormat: oracledb.Object,
                                        autoCommit: true
                                    })
                                    .then(res => {
                                        //resolve({ "status": "filter mapped" })
                                        resolve({ "status": 'Success', "message": "Filter remapped successfully" })
                                    })
                                    .catch(err => {
                                        console.log("ASSET_FILTER View error: " + err);
                                        resolve(err)
                                    })
                            }

                        });
                    }
                })
                .catch(err => {
                    console.log("ASSET_FILTER_ASSET_MAP View error: " + err);
                    resolve(err)
                })
            connection.execute(`SELECT WINSTORY_ID FROM ASSET_WINSTORY_FILTER_WINSTORY_MAP where FILTER_ID=:FILTER_ID`, [data.filter_id],
                {
                    outFormat: oracledb.Object,
                    autoCommit: true
                })
                .then(res => {
                    console.log(JSON.stringify(res));
                    if (res.rows.length > 0) {
                        let binddata = [];
                        // CREATE BIND VARIABLES
                        res.rows.map(val => {
                            console.log(val[0]);
                            let newId = uniqid.process();
                            let values = [];
                            values.push(newId);
                            values.push(val[0]);
                            values.push(data.new_filter_id);
                            binddata.push(values);
                        });
                        let createLinksSql = `Insert into ASSET_WINSTORY_FILTER_WINSTORY_MAP (FILTER_ASSET_MAP_ID,FILTER_ID,WINSTORY_ID) values (:0,:1,:2)`;
                        let options = {
                            autoCommit: true,   // autocommit if there are no batch errors
                            batchErrors: true,  // identify invalid records; start a transaction for valid ones
                            bindDefs: [         // describes the data in 'binds'
                                { type: oracledb.STRING, maxSize: 20 },
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
                                //resolve(result);
                                //resolve({ "status": 'Success', "message": "Filter remapped successfully" })
                                connection.execute(`UPDATE ASSET_FILTER SET FILTER_STATUS=:FILTER_STATUS  WHERE FILTER_ID=:FILTER_ID`, [1, data.new_filter_id],
                                    {
                                        outFormat: oracledb.Object,
                                        autoCommit: true
                                    })
                                    .then(res => {
                                        //resolve({ "status": "filter mapped" })
                                        resolve({ "status": 'Success', "message": "Filter remapped successfully" })
                                    })
                                    .catch(err => {
                                        console.log("ASSET_FILTER View error: " + err);
                                        resolve(err)
                                    })
                            }
                        });
                    }
                })
                .catch(err => {
                    console.log("ASSET_FILTER_ASSET_MAP View error: " + err);
                    resolve(err)
                })
        } else {
            resolve('Please provide existing filterID and new filterID');
        }
    })
}
exports.getAllFilters = (req, host) => {
    host="http://"+host+"/"
    console.log('Admin get All Filters')
    let typeArr = [];
    let filteredArr = [];
    let finalFilterObj = {}
    let filterObj = {};
    let allFilters = [];
    const connection = getDb();
    return new Promise((resolve, reject) => {
        connection.query(`select * from asset_filter`, [],
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
                    filteredArr = filters.filter(f => {
                        console.log(JSON.stringify(f.FILTER_NAME));
                        if (f.FILTER_TYPE != null && f.FILTER_TYPE === type && f.FILTER_NAME != null && !f.FILTER_NAME.toLowerCase().includes('other')) {
                            f.FILTER_TYPE_IMAGE = host + f.FILTER_TYPE_IMAGE;
                            f.FILTER_IMAGE = host + f.FILTER_IMAGE;
                            return f;
                        }

                    });
                    filterObj.Type = type;
                    filterObj.FILTER_TYPE_IMAGE = filteredArr[0].FILTER_TYPE_IMAGE;
                    filteredArr.sort((a, b) => (a.FILTER_NAME > b.FILTER_NAME) ? 1 : -1)
                    const otherArr = filters.filter(f => {
                        if (f.FILTER_TYPE != null && f.FILTER_TYPE === type && f.FILTER_NAME != null && f.FILTER_NAME.toLowerCase().includes('other')) {
                            f.FILTER_TYPE_IMAGE = host + f.FILTER_TYPE_IMAGE;
                            f.FILTER_IMAGE = host + f.FILTER_IMAGE;
                            return f;
                        }
                    });
                    if (otherArr.length === 1) {
                        filteredArr.push(otherArr[0]);
                    }
                    else {
                        otherArr.forEach(o => {
                            filteredArr.push(o)
                        })
                    }
                    filterObj.filters = filteredArr;
                    console.log(filterObj);
                    allFilters.push(filterObj);
                    filterObj = {};
                })
                finalFilterObj.allFilters = allFilters;
                resolve(finalFilterObj)
            })
            .catch(err => {
                console.log(err);
                resolve(err)
            })
    })
}
exports.promoteAsset = (data) => {
    const connection = getDb();
    let newId = uniqid.process();
    let sql;
    let action;
    let options;
    console.log(data);
    return new Promise((resolve, reject) => {
        connection.execute(`Select count(*) "promote_count" from ASSET_LOB_LEADER_PROMOTED_ASSETS where ASSET_ID=:ASSET_ID and STATUS=1`, [data.assetId],
            {
                outFormat: oracledb.OBJECT
            }).then(result => {
                asset_promote_count = result.rows[0].promote_count;
                if (asset_promote_count === 0) {
                    action = 'insert'
                    sql = `INSERT into ASSET_LOB_LEADER_PROMOTED_ASSETS(PROMOTED_ASSET_MAP_ID,LOB_LEADER_EMAIL,LOB_LEADER_LOB,ASSET_ID,PROMOTE_CREATED,STATUS) values(:PROMOTED_ASSET_MAP_ID,:LOB_LEADER_EMAIL,:LOB_LEADER_LOB,:ASSET_ID,:PROMOTE_CREATED,1)`;
                    options = [newId, data.lob_leader_email, data.lob_leader_lob, data.assetId, new Date()]

                }
                else {
                    // sql = `UPDATE ASSET_LOB_LEADER_PROMOTED_ASSETS SET STATUS=0, DEMOTE_DATE=:DEMOTE_DATE, DEMOTED_BY=:DEMOTED_BY  WHERE STATUS=1 and ASSET_ID=:ASSET_ID`;
                    // options = [new Date(), data.lob_leader_email, data.assetId]
                    sql = `delete from ASSET_LOB_LEADER_PROMOTED_ASSETS where asset_id=:ASSET_ID`;
                    options = [data.assetId];
                }
                let getlobid = `select lob_id from asset_lobs where lob_name=:LOB_NAME`;
                let getlobidOptions = [data.lob_leader_lob];
                connection.execute(`select lob_id from asset_lobs where lob_name=:LOB_NAME`, [data.lob_leader_lob],
                    {
                        outFormat: oracledb.Object,
                        autoCommit: true
                    })
                    .then(lobdata => {
                        let lobId = lobdata.rows[0][0];
                        connection.execute(sql, options,
                            {
                                outFormat: oracledb.Object,
                                autoCommit: true
                            })
                            .then(res => {
                                console.log(JSON.stringify(res));
                                if (action === 'insert') {
                                    let query = `INSERT into asset_lob_asset_map(LOB_ID,ASSET_ID) values(:LOB_ID,:ASSET_ID)`
                                    let option = [lobId, data.assetId]
                                    console.log(JSON.stringify(option));
                                    connection.execute(query, option,
                                        {
                                            outFormat: oracledb.Object,
                                            autoCommit: true
                                        })
                                        .then(res => {
                                            console.log(JSON.stringify(res));
                                            if (res.rowsAffected > 0) {
                                                resolve({ "status": 'Success', "message": "Asset promoted successfully" });
                                            }
                                        })
                                }
                                else {
                                    let query = `DELETE FROM asset_lob_asset_map where LOB_ID=:LOB_ID and ASSET_ID=:ASSET_ID`
                                    let option = [lobId, data.assetId]
                                    connection.execute(query, option,
                                        {
                                            outFormat: oracledb.Object,
                                            autoCommit: true
                                        })
                                        .then(res => {
                                            if (res.rowsAffected > 0) {

                                                resolve({ "status": "Asset promotion deactivated successfully" })
                                            }
                                        })
                                }
                            })
                            .catch(err => {
                                console.log(err)
                            })
                    }).catch(err => {
                        console.log(err)
                    })
            })
    })
}
exports.promoteWins = (data) => {
    const connection = getDb();
    let newId = uniqid.process();
    let sql;
    let action;
    let options;
    console.log(data)
    return new Promise((resolve, reject) => {
        connection.execute(`Select count(*) "promote_count" from ASSET_WINSTORY_LOB_LEADER_PROMOTED_WINSTORY where  WINSTORY_ID=:WINSTORY_ID and STATUS=1`, [data.winstoryId],
            {
                outFormat: oracledb.OBJECT
            }).then(result => {
                promote_count = result.rows[0].promote_count;
                if (promote_count === 0) {
                    action = 'insert'
                    console.log("insert section")
                    sql = `INSERT into ASSET_WINSTORY_LOB_LEADER_PROMOTED_WINSTORY(PROMOTED_WINS_MAP_ID,LOB_LEADER_EMAIL,LOB_LEADER_LOB,PROMOTE_CREATED,WINSTORY_ID,STATUS) values(:PROMOTED_WINS_MAP_ID,:LOB_LEADER_EMAIL,:LOB_LEADER_LOB,:PROMOTE_CREATED,:WINSTORY_ID,1)`;
                    options = [newId, data.lob_leader_email, data.lob_leader_lob, new Date(), data.winstoryId]
                }
                else {
                    //console.log("in like unlike section")
                    sql = `UPDATE ASSET_WINSTORY_LOB_LEADER_PROMOTED_WINSTORY SET STATUS=0, DEMOTE_DATE=:DEMOTE_DATE, DEMOTED_BY=:DEMOTED_BY  WHERE STATUS=1 AND WINSTORY_ID=:WINSTORY_ID`;
                    options = [new Date(), data.lob_leader_email, data.winstoryId]
                }
                connection.execute(`select lob_id from asset_lobs where lob_name=:LOB_NAME`, [data.lob_leader_lob],
                    {
                        outFormat: oracledb.Object,
                        autoCommit: true
                    })
                    .then(lobdata => {
                        let lobId = lobdata.rows[0][0];
                        connection.execute(sql, options,
                            {
                                outFormat: oracledb.Object,
                                autoCommit: true
                            })
                            .then(res => {
                                if (action === 'insert') {
                                    let query = `INSERT into ASSET_WINSTORY_LOB_MAP(LOB_ID,WINSTORY_ID) values(:LOB_ID,:WINSTORY_ID)`
                                    let option = [lobId, data.winstoryId]
                                    console.log(JSON.stringify(option));
                                    connection.execute(query, option,
                                        {
                                            outFormat: oracledb.Object,
                                            autoCommit: true
                                        })
                                        .then(res => {
                                            console.log(JSON.stringify(res));
                                            if (res.rowsAffected > 0) {
                                                resolve({ "status": 'Success', "message": "Wins promoted successfully" });
                                            }
                                        })
                                }
                                else {
                                    let query = `DELETE FROM ASSET_WINSTORY_LOB_MAP where LOB_ID=:LOB_ID and WINSTORY_ID=:WINSTORY_ID`
                                    let option = [lobId, data.winstoryId]
                                    connection.execute(query, option,
                                        {
                                            outFormat: oracledb.Object,
                                            autoCommit: true
                                        })
                                        .then(res => {
                                            if (res.rowsAffected > 0) {
                                                resolve({ "status": "Wins promotion deactivated successfully" })
                                            }
                                        })

                                }
                            })
                            .catch(err => {
                                console.log(err)
                            })
                    })
                    .catch(err => {
                        console.log(err)
                    })

            })
    })
}