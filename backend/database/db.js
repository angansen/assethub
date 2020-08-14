const oracledb = require('oracledb');
const Promise = require('promise');
var SimpleOracleDB = require('simple-oracledb');
let _db;
SimpleOracleDB.extend(oracledb);
let pooldb;


// const DbconnectPool = () => {
// 	let dbAttr = {
// 		user: "assethub",
// 		password: "AssetHub#19_",
// 		connectString: "db1.sb5.ahvcn.oraclevcn.com:1521/ah01_iad2gm.sb5.ahvcn.oraclevcn.com"
// 	}
// 	return new Promise((resolve, reject) => {
// 		oracledb.createPool(dbAttr)
// 			.then(res => {
// 				pool = res;
// 				resolve("Db connection pool verified");
// 			}).catch((err) => {
// 				console.log(err);
// 				reject(err);
// 			})
// 	})
// }

const Dbconnect = () => {

	const dbAttr = {


		// *** DEV DB2 CRED ***
		// user: "system",
		// password: "AssetHub#19_",
		// connectString: "db2.sb6.ah.oraclevcn.com:1521/ah01_iad353.sb6.ah.oraclevcn.com"


		//// *** DEV DB1 CRED ***
		// user: "system",
		// password: "AssetHub#19_",
		// connectString: "db1.sb6.ah.oraclevcn.com:1521/ah01_iad3kb.sb6.ah.oraclevcn.com"

		//// *** PROD DB CRED ***
		// user: "assethub",
		// password: "AssetHub#19_",
		// connectString: "db1.sb5.ahvcn.oraclevcn.com:1521/ah01_iad2gm.sb5.ahvcn.oraclevcn.com"
	}
	return new Promise((resolve, reject) => {
		oracledb.getConnection(dbAttr)
			.then(connection => {
				_db = connection;
				resolve('DB connecion verified. . .');
			})
			.catch((err) => {
				console.log(err)
			})
	})

}

async function getpoolconnection() {

	JSON.stringify()
	let dbconnparam = {
		// *** DEV DB CRED ***
		// user: "assethub",
		// password: "AssetHub#19_",
		// connectString: "db1.sb6.ah.oraclevcn.com:1521/pah1.sb6.ah.oraclevcn.com",

		// *** STAGING DB CRED ***
		// user: "assethub",
		// password: "AssetHub#19_",
		// connectString: "db1.sb3.ahvcn.oraclevcn.com:1521/pah1.sb3.ahvcn.oraclevcn.com",


		//// *** PROD DB CRED ***
		user: "assethub",
		password: "AssetHub#19_",
		connectString: "db1.sb5.ahvcn.oraclevcn.com:1521/ah01_iad2gm.sb5.ahvcn.oraclevcn.com",
		_enableStats: true,
		poolMax: 150,
		poolMin: 20,
		poolIncrement: 5,
		poolTimeout: 4
	}
	//SELECT count(username) FROM dba_users;
	return new Promise((resolve, reject) => {
		oracledb.createPool(dbconnparam,
			(err, pool) => {
				if (err) {
					console.log(
						"ERROR: ",
						new Date(),
						": createPool() callback: " + err.message
					);
					return;
				}
				pooldb = pool;

				resolve("Pool db connection created");
			}
		);
	})
}

// async function getpooldb() {
// 	if (!_db) {
// 		_db = await pooldb.getConnection();
// 		// console.log("got connection");
// 	}
// 	if (_db) {
// 		// console.log("Found connection, returning . . .")
// 		return _db;
// 	}
// }


const getpooldb = () => {
	if (!_db) {
		return new Promise((resolve, reject) => {
			// console.log("Open connection > " + pooldb.connectionsOpen+" / "+pooldb.connectionsInUse);
			pooldb.getConnection().then(result => {

				_db = result;
				// console.log("got connection");	
				resolve(_db);
			});
		})


	}

	if (_db) {
		// console.log("Found Open connection > " + pooldb.connectionsOpen+" / "+pooldb.connectionsInUse);
		return _db;
	}
}



const getDb = () => {
	if (!_db) {
		// return _db;
		Dbconnect().then(result => {
			return _db;
		})
	}
	if (_db) {
		return _db;
	}
}


const doRelease = (connection) => {
	let c = connection;
	return new Promise((resolve, reject) => {
		c.release().then(res => {
			resolve("released")
		}).catch(err => {
			resolve(err)
		})
	})

}


module.exports = {
	Dbconnect: getpoolconnection,
	getDb: getpooldb,
	getpooldb: getpooldb,
	doRelease: doRelease
};