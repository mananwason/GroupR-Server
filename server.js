var express = require('express');
var bodyParser = require('body-parser');	
var mongoose = require('mongoose');
var async = require('async');
var gcm = require('node-gcm');

var app = express();
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}));

mongoose.connect('mongodb://localhost/pcsmaProject');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:db'));
db.once('open', function() {
	console.log("Connected with db");
});


var UserSchema = mongoose.Schema({name:String, emailId: String, appId: String, regToken: String});

var User = mongoose.model('User', UserSchema);
/*User.remove({}, function(err) { 
   console.log('collection removed') 
});*/
/*var user1 = new User({name: 'Abhishek Jain', appId:'kashjcjhvcdsyy3334', roles: ['admin', 'user'], emailId:'abhishek13004@iiitd.ac.in'});

console.log(user1);*/



function registerUser(name, appId, emailId, regToken, callback){
	//console.log(regToken, emailId);
	var x = 1;
	User.findOne({emailId: emailId}, function (err, userObj) {
		if (err) {
			console.log(err);
			callback(err,JSON.stringify({responce:"Error"}));
		} 
		else if (userObj) {
			console.log('Found:', userObj);
			userObj.regToken = regToken;
	      	userObj.save(function (err) {
		      	if (err) {
		      		console.log(err);
		      		callback(err,JSON.stringify({"response":"Error in updation"}));
		      	} else {
		      		x=0;
		      		console.log('Updated', userObj);
		      		callback(null,JSON.stringify({"response":"Success"}));
		      	}
	      	});
	  	}	
		else {
			console.log('User not found!');
			var user = new User({name:name, emailId:emailId, appId:appId, regToken: regToken});		
			user.save(function (err, userObj) {
			 	if (err) {
			    	console.log(err);
			    	callback(err,JSON.stringify({"response":"Error"}));
			  	}
			  	else {
			    	console.log('saved successfully:', userObj);
			    	callback(null,JSON.stringify({"response":"Success"}));
			  	}
			});
		}
	});	
	//callback(null,JSON.stringify({"response":x}));
};


app.get('/', function (req, res) {
	res.send('Hello World');
})


app.post("/api/app/register", function(req, res){
	console.log(req.body);
	var reqData = new Array();
	reqData["appId"] = req.body.appId;
	reqData["emailId"] = req.body.emailId;
	reqData["regToken"] = req.body.regToken;
	reqData["name"] = req.body.name;
	//reqData["roles"] = req.body.roles;
	//reqData["name"] = req.body.name; 
	//console.log(reqData);
	registerUser(reqData["name"], reqData["appId"],reqData["emailId"], reqData["regToken"],function(err, result) {
	    res.writeHead(200, {
	      'Content-Type' : 'x-application/json'
	    });
	    res.end(result);
	  });
})



app.get("/api/test", function(req, res){
	User.findOne({emailId: 'abhishek13004@iiitd.ac.in'}, function (err, userObj) {
		if (err) {
			console.log(err);
			//callback(err,JSON.stringify({responce:"Error"}));
		} 
		else if (userObj) {
			var x = userObj.id;
			console.log('Found:', userObj._id.getTimestamp());
			console.log('Found:', userObj.id);
			console.log('Found:', userObj._id);
	  	}	
		else {
			console.log('User not found!');
		}
	});	
	res.writeHead(200, {
	  'Content-Type' : 'x-application/json'
	});
	res.end();
})

app.get("/api/test2", function(req, res){
	var message = new gcm.Message();
	message.addNotification('title', 'You are added to a group');
	message.addNotification('icon', 'ic_launcher');
	message.addNotification('body', 'New group');
	
	var regTokens = new Array();
	regTokens.push("d4xqcEqtFE4:APA91bEwBXVjRH91IN7g_RqIu9p4Fdo33Yrad9ZHqPPkTERLfaqaioHIkkFoJGJqP8TPS8L-TAL4IcxO-hwRiOkwbDqBvy6G47rIeJvJqJZRWCPhZXRNa0ZZk-rGGQRSpsUFMX45tjP9");
	regTokens.push("dxg1RSQOkEI:APA91bHwW-Tj7hr8VqQ1kUvdS_JCUo9Tdwt56TngxsmvLUGVj6S9wGD2w7CI8ZMe5WnegdgkiHT_Ffipt8TjcNg2AbaCTLfZPIKzCDspK4Uj8Wj1t3pGOMTnuPrdUcSwxRwDE-AlKZM0");
	regTokens.push("c6dhESdsrRo:APA91bGD6zO22teZwYow821wcVGMPFALFLKRTZXblGW6ElqX0BYiYS68lbWQe57k_FZ61VmELhZZxrWbKyc_EbI_8CJAaXWlXmUIOgYKHDoMsucbhdf0-oIDxtaLrLvekiFCNT1N53ce");
	
	// Set up the sender with you API key 
	var sender = new gcm.Sender('AIzaSyBBda2eX9Rm1WNPpALhjwlSow-TqgfLOuY');

	sender.send(message, { registrationTokens: regTokens }, function (err, response) {
		if(err) 
			console.error(err);
		else 	
			console.log(response);
	});	
	res.writeHead(200, {
	  'Content-Type' : 'x-application/json'
	});
	res.end();
})

var server = app.listen(8081, function () {

	var host = server.address().address
	var port = server.address().port

	console.log("Example app listening at http://%s:%s", host, port)

})


/*function registerUser(appId, emailId, name, roles, callback){
	console.log(appId, emailId, name, roles);
	User.findOne({emailId: emailId}, function (err, userObj) {
		if (err) {
			console.log(err);
			callback(err,JSON.stringify({responce:"Error"}));
		} 
		else if (userObj) {
			console.log('Found:', userObj);
			userObj.appId = appId;
	      	userObj.save(function (err) {
		      	if (err) {
		      		console.log(err);
		      		callback(err,JSON.stringify({"response":"Error in updation"}));
		      	} else {
		      		console.log('Updated', userObj);
		      		callback(null,JSON.stringify({"response":"User updated"}));
		      	}
	      	});
	  	}	
		else {
			console.log('User not found!');
			var user = new User({name: name, appId: appId, roles: roles, emailId:emailId});		
			user.save(function (err, userObj) {
			 	if (err) {
			    	console.log(err);
			    	callback(err,JSON.stringify({"response":"Error"}));
			  	}
			  	else {
			    	console.log('saved successfully:', userObj);
			    	callback(null,JSON.stringify({"response":"User created"}));
			  	}
			});
		}
	});	
};*/