// const mongodb=require('mongodb');
// const mongoClient=mongodb.MongoClient;

// let _db;

// const mongoConnect=(callback)=>{
//     mongoClient.connect('mongodb+srv://Aryan:kLfKwx4A6MksgB5K@cluster0.mexrghk.mongodb.net/shop?retryWrites=true&w=majority')
//     .then((client)=>{
//         console.log('Connected!');
//         _db=client.db();
//         callback();
//     })
//     .catch(err=>{
//         console.log(err);
//         throw err;
//     });
// };

// const getDb=()=>{
//     if(_db){
//         return _db;
//     }
//     throw 'No Database Found';
// };

// exports.mongoConnect=mongoConnect;
// exports.getDb=getDb;
