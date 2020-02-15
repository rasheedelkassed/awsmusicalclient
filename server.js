const express = require('express');
const multer  = require('multer');
const AWS = require('aws-sdk');
const fs=require('fs');
// const keys = require('./keys.js');

const app = express();

app.set('view engine', 'pug');

//Creating a new instance of S3:
const s3= new AWS.S3();

app.get('/', async (req,res)=>{
    
    let list = await getAllSongs(res);
    res.render('index', {keys: createArtistList(list)})
  });


app.get('/getSong/:file_name*', async (req,res)=>{
    let songUrl = await getSong(req.params.file_name + req.params[0]);
    res.redirect(songUrl);
  });

//listening to server 80
app.listen(80,()=>{
    console.log('Server running on port 80');
});


async function getAllSongs(res){
    const getParams = {
        Bucket: 'awsmusicservice'
    };

    let allKeys = [];

    const data = await s3.listObjects(getParams).promise().catch(
        (err) => {
            console.error(err, err.stack);
            Promise.reject(err);
        });

    data.Contents.forEach((song) => {
        allKeys.push(song.Key);
    });
    return allKeys;
}

async function getSong(filename){

    const getParams = {
      Bucket: 'awsmusicservice',
      Key: filename
    };

    // const data = await s3.getObject(getParams).promise().catch(
    //     (err) => {
    //         console.error(err, err.stack);
    //     });

    //     return res.send(data.Body);
    const url =  await s3.getSignedUrlPromise('getObject', getParams).catch(
        (err) => {
            console.error(err, err.stack);
            Promise.reject(err);
        });
    return await url;
}

//list items look like artist/album/song
function createArtistList(list){
    let artistList = {};

    list.forEach(key => {
        let split_song = key.split('/');
        let artist = split_song[0];
        let album = split_song[1];
        let song = split_song[2];
        if(artistList[artist] != null){
            artistList[artist][album].push(song);
        } else {
            artistList[artist] = {};
            artistList[artist][album] = [];
            artistList[artist][album].push(song);
        }
    });
    
    return artistList;
}