# PID webui

This repository contains web interface, which enable you to use web browser to adjust PID parameters. Absolutely prototype version, use on your own risk.

Interface is based on [RobotWebTools project](https://github.com/RobotWebTools).

## Installation

To install required dependencies:

`sudo apt update`

`sudo apt install python-tornado python-pip ros-kinetic-rosbridge-suite ros-kinetic-web-video-server nginx`

`sudo nano /etc/nginx/sites-enabled/default`

Edit line `       root /var/www/html;` to point to index.html, depending on where you downloaded repo.

`sudo systemctl restart nginx`

`roslaunch rosbridge.launch`

Go to the web browser and type `http://localhost/`.