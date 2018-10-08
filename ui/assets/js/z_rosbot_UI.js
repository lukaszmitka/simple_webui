var joyPosY;
var joyPosX;
var manager;
var lin;
var ang;
var joystick_timeout;
var velocity_repeat_delay = 100; // [ms]

var twist;
var ros;
var cmdVel;
var pose_subscriber;

var timerInstance;
var watchdogTimerInstance;
var teleop;

var lastMsgDate = new Date();
var lastMsgMs = lastMsgDate.getTime();
var currentMsgDate = new Date();
var currentMsgMs = currentMsgDate.getTime();

window.onload = function () {
	console.log("onLoad triggered");

	twist = new ROSLIB.Message({
		linear: {
			x: 0,
			y: 0,
			z: 0
		},
		angular: {
			x: 0,
			y: 0,
			z: 0
		}
	});

	ros = new ROSLIB.Ros({
		url: "ws://" + location.hostname + ":9090"
	});

	cmdVel = new ROSLIB.Topic({
		ros: ros,
		name: '/cmd_vel',
		messageType: 'geometry_msgs/Twist'
	});

	cmdVel.advertise();

	ros.on('connection', function () {
		console.log('Connected to websocket server.');
	});

	ros.on('error', function (error) {
		console.log('Error connecting to websocket server: ', error);
		// todo: show big error and ask to reload
	});

	ros.on('close', function () {
		console.log('Connection to websocket server closed.');
	});

	pose_subscriber = new ROSLIB.Topic({
		ros: ros,
		name: '/pose',
		messageType: 'geometry_msgs/PoseStamped'
	});

	pose_subscriber.subscribe(function (pose) {
		lastMsgDate = new Date();
		lastMsgMs = lastMsgDate.getTime();
	});

	setView();

	watchdogTimerInstance = new Timer();
	watchdogTimerInstance.addEventListener('secondTenthsUpdated', watchdogTimer);
	watchdogTimerInstance.start();
};

function watchdogTimer(e) {
	currentMsgDate = new Date();
	currentMsgMs = currentMsgDate.getTime();
	if (currentMsgMs - lastMsgMs > 1000) {
		noMessage = "No messege received since ";
		checkConn = " seconds.\n\rCheck your internet connection and reload this page!"
		$.notify(noMessage.concat(parseInt((currentMsgMs - lastMsgMs) / 1000)).concat(checkConn),
			{
				autoHideDelay: 990,
				position: "top left",
				className: 'warn',
				showDuration: 0,
				hideDuration: 0,
				gap: 2
			});
	}
}

function removeJoystick() {
	joystickContainer = document.getElementById('joystick');
	while (joystickContainer.hasChildNodes()) {
		joystickContainer.removeChild(joystickContainer.childNodes[0]);
	}
	if (!jQuery.isEmptyObject(manager)) {
		manager.destroy();
	}
}

function setView() {
	console.log("SetView triggered");
	removeJoystick();
	joySize = 600;
	joyPosY = ($(window).height() - joySize) / 2;
	joyPosX = ($(window).width() - joySize) / 2;
	console.log("Create joystick: x=", joyPosX, ", y=", joyPosY);
	createJoystick(300, 300, joySize * 2 / 3);
	initTeleopKeyboard();
}

function repeat_velcmd(v_lin, v_ang) {
	console.log("Command repeated");
	moveAction(v_lin, v_ang)
	joystick_timeout = setTimeout(function () { repeat_velcmd(lin, ang); }, velocity_repeat_delay);
}

function createJoystick(x, y, d) {
	joystickContainer = document.getElementById('joystick');

	var options = {
		zone: joystickContainer,
		position: { left: x + 'px', top: y + 'px' },
		mode: 'static',
		size: d,
		color: '#222222',
		restJoystick: true
	};
	manager = nipplejs.create(options);
	manager.on('move', function (evt, nipple) {
		var direction = nipple.angle.degree - 90;
		if (direction > 180) {
			direction = -(450 - nipple.angle.degree);
		}
		lin = Math.cos(direction / 57.29) * nipple.distance * 0.005;
		ang = Math.sin(direction / 57.29) * nipple.distance * 0.05;
		clearTimeout(joystick_timeout);
		moveAction(lin, ang);
		joystick_timeout = setTimeout(function () { repeat_velcmd(lin, ang); }, velocity_repeat_delay);
	});
	manager.on('end', function () {
		clearTimeout(joystick_timeout);
		moveAction(0, 0);
	});
}

function moveAction(linear, angular) {
	twist.linear.x = 0;
	twist.linear.y = 0;
	twist.linear.z = 0;
	twist.angular.x = 0;
	twist.angular.y = 0;
	twist.angular.z = 0;
	if (linear !== undefined && angular !== undefined) {
		twist.linear.x = linear;
		twist.angular.z = angular;
	}
	cmdVel.publish(twist);
}

function initTeleopKeyboard() {
	// Use w, s, a, d keys to drive your robot

	// Check if keyboard controller was aready created
	if (teleop == null) {
		// Initialize the teleop.
		teleop = new KEYBOARDTELEOP.Teleop({
			ros: ros,
			topic: '/cmd_vel'
		});
	}

	teleop.scale = 0.25;
}