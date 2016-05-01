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


var UserSchema = mongoose.Schema({name:String, emailId: String, appId: String, regToken: String, adminOf:[String], subscriptions:[String]});
var GroupSchema = mongoose.Schema({name:String, info:String, admins:[String], createdBy: String});
var SubscriptionSchema = mongoose.Schema({studentId:String, groupId:String}); //and status whether subscribing or unscubscribing
var UpdatesSchema = mongoose.Schema({groupId:String, postedBy:String, heading:String, text:String}); //groupId, emailId, text
var EventInfoSchema = mongoose.Schema({groupId:String, createdBy:String, title:String, info:String, responseEndTime:String, startTime:String, endTime:String});//
var EventStatusSchema = mongoose.Schema({eventId:String, studentId:String, lastUpdatedAt:String, Status:String});


var User = mongoose.model('User', UserSchema);
var Groups = mongoose.model('Groups', GroupSchema);
var Subscriptions = mongoose.model('Subscriptions', SubscriptionSchema);
var Updates = mongoose.model('Updates', UpdatesSchema);
var EventInfoSchema = mongoose.model('EventsInfo', EventInfoSchema);
var EventStatusSchema = mongoose.model('EventsStatus',EventStatusSchema);
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
			callback(err,JSON.stringify({response:"error"}));
		} 
		else if (userObj) {
			console.log('Found:', userObj.id, userObj.emailId);
			userObj.regToken = regToken;
	      	userObj.save(function (err) {
		      	if (err) {
		      		console.log(err);
		      		callback(err,JSON.stringify({"response":"error"}));
		      	} else {
		      		x=0;
		      		console.log('Updated', userObj.id, userObj.emailId);
		      		callback(null,JSON.stringify({"response":"success"}));
		      	}
	      	});
	  	}	
		else {
			console.log('User not found!');
			var user = new User({name:name, emailId:emailId, appId:appId, regToken: regToken, adminOf:new Array(), subscriptions:new Array()});		
			user.save(function (err, userObj) {
			 	if (err) {
			    	console.log(err);
			    	callback(err,JSON.stringify({"response":"error"}));
			  	}
			  	else {
			    	console.log('saved successfully:', userObj.id, userObj.emailId);
			    	callback(null,JSON.stringify({"response":"success"}));
			  	}
			});
		}
	});	
	//callback(null,JSON.stringify({"response":x}));
};

app.post("/api/app/register", function(req, res){
	//console.log(req.body);
	var reqData = new Array();
	reqData["appId"] = req.body.appId;
	reqData["emailId"] = req.body.emailId;
	reqData["regToken"] = req.body.regToken;
	reqData["name"] = req.body.name;
	registerUser(reqData["name"], reqData["appId"],reqData["emailId"], reqData["regToken"],function(err, result) {
	    res.writeHead(200, {
	      'Content-Type' : 'x-application/json'
	    });
	    res.end(result);
	  });
})


function createGroup(appId, emailId, groupName, admins, groupInfo, callback){
	Groups.findOne({name: groupName}, function (err, groupObj) {
		if (err) {
			console.log(err);
			callback(err,JSON.stringify({response:"error"}));
		} 
		else if (groupObj) {
			console.log('Group already exists!', groupObj);
			callback(err,JSON.stringify({"response":"error", "info":"Group with same name already exists."}));
	  	}	
		else {
			var newGroup = new Groups({name:groupName, info:groupInfo, admins:admins, createdBy:emailId});		
			newGroup.save(function (err, obj) {
			 	if (err) {
			    	console.log(err);
			    	callback(err,JSON.stringify({"response":"error"}));
			  	}
			  	else {
			    	console.log('Group saved successfully:', obj);
			    	console.log("admins",admins);
			    	User.find({"emailId":{$in:admins}},function(err,users){
						if (err) {
			    			console.log(err);
			    			//callback(err,JSON.stringify({response:"error"}));
			    		} 
			    		else {
			    			var calls=[];
			    			var count = 0;
			    			var asyncCallback = function(data){
			    				console.log(data);
			    			}
			    			users.forEach(function(usr){
			    			    calls.push(function(asyncCallback) {
			    			    	usr.adminOf.push(obj.id);
	    			    	      	usr.save(function (err) {
	    			    	      		count++;
	    			    		      	if (err) {
	    			    		      		console.log(err);
	    			    		      		//callback(err,JSON.stringify({"response":"error in updation"}));
	    			    		      	} else {
	    			    		      		console.log('Updated', usr.emailId,usr.adminOf);
	    			    		      		if(count==users.length){
	    			    		      			asyncCallback("All admins updated.");	
	    			    		      		}
	    			    		      		
	    			    		      	}
	    			    	      	});
			    			    })
			    			});
			    			async.parallel(calls, function(err, result) {
			    				console.log("async calls success");
			    				console.log("***********\n",result);
			    				//send notification to all recipients
			    			    callback(null,JSON.stringify({"response":"success"}));	
			    			    /* this code will run after all calls finished the job or
			    			       when any of the calls passes an error */
			    			    if (err)
			    			        return console.log(err);
			    			});
			    	  	}		    			
			    	});
			    	//callback(null,JSON.stringify({"response":"success"}));
			  	}
			});
		}
	});	
}

app.post("/api/app/newGroup", function(req, res){
	//console.log(req.body);
	var reqData = new Array();
	reqData["appId"] = req.body.appId;
	reqData["emailId"] = req.body.emailId;
	reqData["groupName"] = req.body.groupName;
	reqData["admins"] = req.body.admins;
	reqData["info"] = req.body.information;
	console.log(reqData);
	//appId, emailId, groupName, admins, groupInfo, callback
	createGroup(reqData["appId"], reqData["emailId"], reqData["groupName"], reqData["admins"], reqData["info"], function(err, result) {
	    res.writeHead(200, {
	      'Content-Type' : 'x-application/json'
	    });
	    res.end(result);
	  });
})

function createUpdate(appId, emailId, groupId, info, callback){
	var update = new Updates({groupId:groupId, postedBy:emailId, text:info});		
	update.save(function (err, updateObj) {
	 	if (err) {
	    	console.log(err);
	    	callback(err,JSON.stringify({"response":"error"}));
	  	}
	  	else {
	    	console.log('saved successfully:', update.id, update.text);
	    	callback(null,JSON.stringify({"response":"success"}));
	  	}
	});
	User.find({},function(err,users){
		if (err) {
			console.log(err);
			//callback(err,JSON.stringify({response:"error"}));
		} 
		else {
			var userRegTokens=new Array();
			users.forEach(function(usr){
				if(usr.subscriptions.indexOf(groupId)!=-1){
					userRegTokens.push(users[i].regToken);
				}
			});
			var message = new gcm.Message();
			message.addData('subType', type);
			message.addNotification('title', 'New Update.');
			message.addNotification('icon', 'ic_launcher');
			message.addNotification('body', info);
			 
			//var userRegTokens = ['c-tzQcH2lLs:APA91bEr2doq6kpVcEpfTvwHyXDulkHGPPZlwYwU2z0CbXmWdP1vlX3J3lpcUQM0Ay19kzrmVh2nmWjFCJJce9C8ysKgP3epGSpY8zDO8DXxCM6F5pp-SIwirot7YZ7OLG8VLVmeOyUO','cBX-CGtxQ0c:APA91bEuI_yz-SvBWic6qkpMZVosP8xoMeuD0GnpcFrKV1OsWu3Cr7vpCV5hvmmCUF9xlo3cVIt07cNAatwdimqhrEOATZvtIGvXu5V-zgm1Jb9QAfekxf-aClDFr8HbW3wqogVYcAiz'];
			
			var sender = new gcm.Sender('AIzaSyBzbzD-FjYiJUl6x0UkIsybGCN638LbOIQ');
			
			sender.send(message, { registrationTokens: userRegTokens }, function (err, response) {
				if(err) 
					console.error(err);
				else 	
					console.log(response);
			});
	  	}		    			
	});
}


app.post("/api/app/newUpdate", function(req, res){
	//console.log(req.body);
	//var UpdatesSchema = mongoose.Schema({groupId:String, postedBy:String, heading:String, text:String}); //groupId, emailId, text
	var reqData = new Array();
	reqData["appId"] = req.body.appId;
	reqData["emailId"] = req.body.emailId;
	reqData["groupId"] = req.body.groupId;
	//reqData["admins"] = req.body.admins;
	reqData["info"] = req.body.information;
	console.log(reqData);
	createUpdate(reqData["appId"], reqData["emailId"], reqData["groupId"], reqData["info"], function(err, result) {
	    res.writeHead(200, {
	      'Content-Type' : 'x-application/json'
	    });
	    res.end(result);
	  });
})

function createEvent(appId, emailId, groupId, title, responseEndTime, startTime, endTime, info, callback){
	var evnt = new Events({groupId:groupId, createdBy:emailId, title:title, info:info, responseEndTime:responseEndTime, startTime:startTime, endTime:endTime});		
	evnt.save(function (err, eventObj) {
	 	if (err) {
	    	console.log(err);
	    	callback(err,JSON.stringify({"response":"error"}));
	  	}
	  	else {
	    	console.log('saved successfully:', eventObj.id, eventObj.info);
	    	callback(null,JSON.stringify({"response":"success"}));
	  	}
	});
	User.find({},function(err,users){
		if (err) {
			console.log(err);
			//callback(err,JSON.stringify({response:"error"}));
		} 
		else {
			var userRegTokens=new Array();
			users.forEach(function(usr){
				if(usr.subscriptions.indexOf(groupId)!=-1){
					userRegTokens.push(users[i].regToken);
				}
			});
			var message = new gcm.Message();
			message.addData('subType', type);
			message.addNotification('title', 'New Event - '+title);
			message.addNotification('icon', 'ic_launcher');
			message.addNotification('body', info);
			 
			//var userRegTokens = ['c-tzQcH2lLs:APA91bEr2doq6kpVcEpfTvwHyXDulkHGPPZlwYwU2z0CbXmWdP1vlX3J3lpcUQM0Ay19kzrmVh2nmWjFCJJce9C8ysKgP3epGSpY8zDO8DXxCM6F5pp-SIwirot7YZ7OLG8VLVmeOyUO','cBX-CGtxQ0c:APA91bEuI_yz-SvBWic6qkpMZVosP8xoMeuD0GnpcFrKV1OsWu3Cr7vpCV5hvmmCUF9xlo3cVIt07cNAatwdimqhrEOATZvtIGvXu5V-zgm1Jb9QAfekxf-aClDFr8HbW3wqogVYcAiz'];
			
			var sender = new gcm.Sender('AIzaSyBzbzD-FjYiJUl6x0UkIsybGCN638LbOIQ');
			
			sender.send(message, { registrationTokens: userRegTokens }, function (err, response) {
				if(err) 
					console.error(err);
				else 	
					console.log(response);
			});
	  	}		    			
	});
}


app.post("/api/app/newEvent", function(req, res){
	//console.log(req.body);
	//var EventInfoSchema = mongoose.Schema({groupId:String, createdBy:String, title:String, info:String, startTime:String, endTime:String});//
	//var EventStatusSchema = mongoose.Schema({eventId:String, studentId:String, lastUpdatedAt:String, Status:String});
	var reqData = new Array();
	reqData["appId"] = req.body.appId;
	reqData["emailId"] = req.body.emailId;
	reqData["groupId"] = req.body.groupId;
	reqData["title"] = req.body.title;
	reqData["responseEndTime"] = req.body.responseEndTime;
	reqData["startTime"] = req.body.startTime;
	reqData["endTime"] = req.body.endTime;
	reqData["info"] = req.body.information;
	console.log(reqData);
	createEvent(reqData["appId"], reqData["emailId"], reqData["groupId"], reqData["title"],reqData["responseEndTime"],reqData["startTime"],reqData["endTime"], reqData["info"], function(err, result) {
	    res.writeHead(200, {
	      'Content-Type' : 'x-application/json'
	    });
	    res.end(result);
	  });
})


function subscribeToGroup(appId, emailId, groupId, status, callback){
	User.findOne({emailId: emailId}, function (err, userObj) {
		if (err) {
			console.log(err);
			callback(err,JSON.stringify({response:"error"}));
		} 
		else if (userObj) {
			if(status.localCompare("yes")==0){
				if(userObj.subscriptions.indexOf(groupId)!=-1){
					callback(err,JSON.stringify({"response":"success"}));
				}	
				else{
					userObj.subscriptions.push(groupId);
			      	userObj.save(function (err) {
				      	if (err) {
				      		console.log(err);
				      		callback(err,JSON.stringify({"response":"error"}));
				      	} else {
				      		console.log('User subscriptions updated, subscribed', userObj);
				      		callback(null,JSON.stringify({"response":"success"}));
				      	}
			      	});
				}
			}
			else{
				var ind = userObj.subscriptions.indexOf(groupId);
				if(ind==-1){
					callback(err,JSON.stringify({"response":"success"}));
				}
				else{
					userObj.subscriptions.splice(ind,1);
					userObj.save(function (err) {
				      	if (err) {
				      		console.log(err);
				      		callback(err,JSON.stringify({"response":"error"}));
				      	} else {
				      		console.log('User subscriptions updated, unsubscribed', userObj);
				      		callback(null,JSON.stringify({"response":"success"}));
				      	}
			      	});
				}
			}
	  	}	
		else {
			callback(err,JSON.stringify({response:"error"}));
		}
	});	
}

app.post("/api/app/subscribeToGroup", function(req, res){
	//var SubscriptionSchema = mongoose.Schema({studentId:String, groupId:String}); //and status whether subscribing or unscubscribing
	console.log(req.body);
	var reqData = new Array();
	reqData["appId"] = req.body.appId;
	reqData["emailId"] = req.body.emailId;
	reqData["groupId"] = req.body.groupId;
	reqData["status"] = req.body.status;
	subscribeToGroup(reqData["appId"], reqData["emailId"], reqData["groupId"], reqData["status"], function(err, result) {
	    res.writeHead(200, {
	      'Content-Type' : 'x-application/json'
	    });
	    res.end(result);
	  });
})

function sendGroups(appId, emailId, callback){
	//var UserSchema = mongoose.Schema({name:String, emailId: String, appId: String, regToken: String, adminOf:[String], subscriptions:[String]});
	//var GroupSchema = mongoose.Schema({name:String, info:String, admins:[String], createdBy: String});
	//var SubscriptionSchema = mongoose.Schema({studentId:String, groupId:String}); //and status whether subscribing or unscubscribing

	User.findOne({emailId:emailId}, function (err, usrObj) {
		if (err) {
			console.log(err);
			callback(err,JSON.stringify({"response":"error", "info":'error reading user database!'}));
		} 
		else if (!usrObj) {
			console.log('\nUser not found!\n');
			callback(err,JSON.stringify({"response":"error", "info":'user not found!'}));
	  	}
	  	else{
	  		Groups.find({}, function (err, allGroups) {
	  			if (err) {
	  				console.log(err);
	  				callback(err,JSON.stringify({"response":"error", "info":"error reading groups database!"}));
	  			} 
	  			
	  			buildGroups = [];
	  			allGroups.forEach(function(grpObj){
	  				var admin = "no";
	  				var subscriber = "no";
	  				if(usrObj.adminOf.indexOf(grpObj.id)!=-1){
	  					admin = "yes";
	  					subscriber = "yes";
	  				}
	  				if(usrObj.subscriptions.indexOf(grpObj.id)!=-1){
	  					subscriber = "yes";
	  				}
	  				buildGroups.push({
	  					"id":grpObj.id,
	  					"name":grpObj.name,
	  					"logo":"",
	  					"desc":grpObj.info,
	  					"adminEmails":grpObj.admins,
	  					"admin":admin,
	  					"member":subscriber
	  				})
	  			});
	  			console.log(buildGroups);
	  			callback(err,JSON.stringify({"response":"success", "groupData":buildGroups}));
	  		});		
	  	}
	});
}

app.post("/api/app/getGroups", function(req, res){
	//var SubscriptionSchema = mongoose.Schema({studentId:String, groupId:String}); //and status whether subscribing or unscubscribing
	//console.log(req.body);
	var reqData = new Array();
	reqData["appId"] = req.body.appId;
	reqData["emailId"] = req.body.emailId;
	//reqData["groupId"] = req.body.groupId;
	//reqData["status"] = req.body.status;
	console.log(reqData);
	sendGroups(reqData["appId"], reqData["emailId"], function(err, result) {
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
			//callback(err,JSON.stringify({response:"error"}));
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

app.get('/image', function (req, res) {
    res.sendFile("/College//Sem 6//pcsma//project//server//sd.png");
});


app.get('/', function (req, res) {
	res.send('Hello World');
})


var server = app.listen(8081, function () {

	var host = server.address().address
	var port = server.address().port

	console.log("Example app listening at http://%s:%s", host, port)

})