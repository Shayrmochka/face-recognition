
const express = require('express');
const cors = require('cors')
const mysql = require('mysql');

const app = express();


const SELECT_PEOPLE = "SELECT * FROM people"
const SELECT_USERS = "SELECT * FROM users"
 
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  database: "iafis",
  password: "password"
});

connection.connect(err => {
  if(err) {
    return err
  }
})

app.use(cors())

app.get('/', function(req, res) {
  res.send('It is working')
})

app.get("/people", function(req, res){
    connection.query(SELECT_PEOPLE, function(err, results) {
      if(err) {
        return res.send(err)
      } else {
        return res.json({
          data: results
        })
      }
    });
});

app.get("/users", function(req, res){
  connection.query(SELECT_USERS, function(err, results) {
    if(err) {
      return res.send(err)
    } else {
      return res.json({
        data: results
      })
    }
  });
});

 
app.listen(4000, function(){
  console.log("Server is working...");
});