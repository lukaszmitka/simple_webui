var joyPosY;
var joyPosX;
var manager;
var lin;
var ang;
var joystick_timeout;
var velocity_repeat_delay = 100; // [ms]
var max_joy_pos = 0;

var twist;
var ros;
var cmdVel;
var pose_subscriber;
var battery_subscriber;
var wifiSubscriber;

var timerInstance;
var watchdogTimerInstance;
var teleop;
var connectionWarningElement;
var resize_tout;

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

	battery_subscriber = new ROSLIB.Topic({
		ros: ros,
		name: '/battery',
		messageType: 'sensor_msgs/BatteryState'
	});

	wifiSubscriber = new ROSLIB.Topic({
		ros: ros,
		name: '/wifi_status',
		messageType: 'diagnostic_msgs/DiagnosticArray'
	});

	pose_subscriber.subscribe(function (pose) {
		lastMsgDate = new Date();
		lastMsgMs = lastMsgDate.getTime();
	});

	battery_subscriber.subscribe(function (battery) {
		setBatteryVoltage(battery.voltage);
		lastMsgDate = new Date();
		lastMsgMs = lastMsgDate.getTime();
	});

	wifiSubscriber.subscribe(function (statuses) {
		updateWifiStatuses(statuses);
	});

	setView();

	watchdogTimerInstance = new Timer();
	watchdogTimerInstance.addEventListener('secondTenthsUpdated', watchdogTimer);
	watchdogTimerInstance.start();
};

$(window).resize(function () {
	setView();
});

function updateWifiStatuses(wifiStatuses) {
	// console.log("Statuses ", wifiStatuses);
	var wifiStatusP1 = '<div class="text-center mx-1">';
	var wifiStatusP2 = '<img src="assets/img/wifi-';
	var wifiStatusP3 = '.png" class="wifi-status mx-1" alt="wifi-status"></div>';
	var wifiStatusStr;
	var wifiStatusAggregated = "";
	for (i = 0; i < wifiStatuses.status.length; i++) {
		var wifiPercent;
		for (j = 0; j < wifiStatuses.status[i].values.length; j++) {
			if (wifiStatuses.status[i].values[j].key = "percentage") {
				wifiPercent = wifiStatuses.status[i].values[j].value;
			}
		}
		wifiStatusStr = wifiStatusP1 + wifiStatuses.status[i].name + wifiStatusP2 + Math.ceil(wifiPercent / 25) + wifiStatusP3;
		// console.log("Received WiFi status: ", wifiStatuses.status[i].name, ", strength: ", Math.ceil(wifiPercent / 25), "/4");
		wifiStatusAggregated += wifiStatusStr;
	}
	console.log(wifiStatusAggregated);
	wifiStatusElem = document.getElementById('wifi-status');
	wifiStatusElem.style.display = "inherit";
	wifiStatusContainer = document.getElementById('wifi-status-container');
	wifiStatusContainer.innerHTML = wifiStatusAggregated;
}

function setBatteryVoltage(voltage) {
	batteryIndicator = document.getElementById('battery');
	battStatus = "Battery: ";
	battUnit = " V";
	batteryIndicator.innerHTML = battStatus.concat(parseFloat(voltage).toFixed(2)).concat(battUnit);
}

function watchdogTimer(e) {
	currentMsgDate = new Date();
	currentMsgMs = currentMsgDate.getTime();
	if (currentMsgMs - lastMsgMs > 1000) {
		noMessage = "No messege received since ";
		checkConn = " seconds. Check your internet connection and reload this page!"

		connectionWarningElement = document.getElementById('conn-warn-container');
		connectionWarningElement.style.display = "inherit";
		connectionWarningElement = document.getElementById('conn-warn');
		connectionWarningElement.innerHTML = noMessage.concat(parseInt((currentMsgMs - lastMsgMs) / 1000)).concat(checkConn);
	} else {
		connectionWarningElement = document.getElementById('conn-warn-container');
		connectionWarningElement.style.display = "none";
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
	removeJoystick();
	joySize = 400;
	if (joySize > $(window).height()) {
		joySize = $(window).height();
	}
	if (joySize > $(window).width()) {
		joySize = $(window).width();
	}
	max_joy_pos = joySize / 3;
	createJoystick($(window).width() / 2, $(window).height() / 2, joySize * 2 / 3);
	initTeleopKeyboard();
}

function repeat_velcmd(v_lin, v_ang) {
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
		// 2,39 m/s max speed
		// 4,33 rad/s max rotation speed
		lin = Math.cos(direction / 57.29) * 2.39 * nipple.distance / max_joy_pos;
		ang = Math.sin(direction / 57.29) * 4.33 * nipple.distance / max_joy_pos;
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