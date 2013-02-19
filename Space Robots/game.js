		//Utils
			/*function degToRad(angle) {
				return ((angle*Math.PI) / 180);
			}
			
			function radToDeg(angle) {
				return ((angle*180) / Math.PI);
			}*/
			// Array Remove - By John Resig (MIT Licensed)
			Array.prototype.remove = function(from, to) {
			  var rest = this.slice((to || from) + 1 || this.length);
			  this.length = from < 0 ? this.length + from : from;
			  return this.push.apply(this, rest);
			};
		//Resources
		function loadImages(sources, callback) {
        var images = {};
        var loadedImages = 0;
        var numImages = 0;
        // get num of sources
        for(var src in sources) {
          numImages++;
        }
        for(var src in sources) {
          images[src] = new Image();
          images[src].onload = function() {
            if(++loadedImages >= numImages) {
              callback(images);
            }
          };
          images[src].src = sources[src];
        }
      }

      var sources = {
        me: 'imgs/me.png',
        ship: 'imgs/enemy.png',
        meteor: 'imgs/asteroid.png',
        bg: 'imgs/bg.jpg',
        projectile: 'imgs/lazor.png'
      };

      var resources;
		//Net
			var socket;
			var hasRefresh=false;
			function init(){
				screen("Loading and connecting...");
				loadImages(sources, function(images) {
			      	resources = images;
			        load++;
			        if(load>=2){
			        	setInterval(update,1000/30);
			        }
			        else if(!hasRefresh){
			        	screen("Connecting... (Loaded)");
			        }
			      });
				socket = new WebSocket("ws://localhost:9999/");
				socket.onopen = function (evt){
					load++;
			        if(load>=2){
			        	setInterval(update,1000/30);
			        }else{
			        	screen("Loading... (Connected)");
			        }
				};
				socket.onerror = function (evt) {
					//document.getElementById("main").innerHTML += "Error: "+JSON.stringify(evt)+"<br>"+socket.readyState+"<br/>";
					hasRefresh=true;
				  screen("Cannot connect to server! Please refresh, sorry"+"Error: "+JSON.stringify(evt));
				};
				socket.onclose = function (evt) {
					//alert("Close");
				  hasRefresh=true;
				  screen("Connection closed! Please refresh, sorry");
				};
				socket.onmessage = function(evt) {
				document.getElementById("main").innerHTML += "Msg: "+evt.data+"<br>";
				};
				lastUpdate=new Date();
			}
		//Controls
		var left,right,up,down;
		var cooldown=0;
		window.onkeydown = function (evt){
			switch(evt.which){
				case 87:
					up=true;
				break;
				case 65:
					left=true;
				break;
				case 83:
					down=true;
				break;
				case 68:
					right=true;
				break;
				case 90:
					if(cooldown<=0){
						var bullet = {
							direction: 0,
							velocity: 0,
							id: -1,
							x: 0,
							y: 0,
							resId: 3,
							life: 1000*4
						};
						bullet.direction = player.direction;
						bullet.x=player.x+resources.me.width/2;
						bullet.y=player.y+resources.me.height/2;
						bullet.velocity=player.velocity+100;
						bullet.resId=3;
						bullet.life=1000*2.5;//~3.3secs lifetime?
						entities.push(bullet);
						cooldown=320;
						//console.log(entities);
						//TODO net
					}
				break;
			}
		};
		window.onkeyup = function (evt){
			switch(evt.which){
				case 87:
					up=false;
				break;
				case 65:
					left=false;
				break;
				case 83:
					down=false;
				break;
				case 68:
					right=false;
				break;
			}
		};
		//Game	
		var load=0;
			var player = {
				direction: 0,
				velocity: 0,
				id: 0,
				x: 0,
				y: 0,
				resId: 0
			};
			var entities=new Array(), players=new Array();
			
			var lastUpdate;
			
			function update(){
				var now = new Date()
				var dt = now.getTime()-lastUpdate.getTime();//delta time
				lastUpdate=now;
				//update events
				if(up){
					player.velocity+=dt/10;//TODO net
				}
				if(down){
					player.velocity-=dt/10;//TODO net
				}
				if(right){
					player.direction+=dt/300;//TODO net
				}
				if(left){
					player.direction-=dt/300;//TODO net
				}
				//endof events
				if(document.getElementById("doUpdate").checked){
					eval(document.getElementById("code").value);
				}
				if(player.velocity>200){
					player.velocity=200;
				}
				player.velocity-=dt/100;//friction
				if(player.velocity<0){
					player.velocity=0;
				}
				cooldown-=dt;
				velocity(player,dt); //"physics"
				for(var e in entities){
					velocity(entities[e],dt);
					entities[e].life-=dt;
					if(entities[e].life<=0){
						entities.remove(e);
					}
				}
				for(var e in players){
					velocity(entities[e],dt);
				}
				redraw();//self-explanatory :)
			}
			
			function velocity(entity,dt){
				entity.x+=Math.cos(entity.direction)*entity.velocity*dt/1000;
				entity.y+=Math.sin(entity.direction)*entity.velocity*dt/1000;
			}
		//Graphics	
			function redraw(){
				var canvas = document.getElementById("canvas");
				var ctx=canvas.getContext('2d');
				ctx.save();
				ctx.fillStyle = "rgb(0,0,0)";
        		ctx.fillRect (0, 0, 800, 600);//clear
        		drawBg(ctx);
        		ctx.translate(-player.x-(resources.me.width/2)+400,-player.y-(resources.me.height/2)+300);
        		drawEntity(ctx,player);
        		for(var e in entities){
        			//console.log(entities[e]);
        			drawEntity(ctx,entities[e]);
        		}
        		for(var e in players){
        			drawEntity(ctx,entities[e]);
        		}
				ctx.restore();
			}
			function drawEntity(ctx,entity){
				var img;
				switch(entity.resId){
					case 0:
						img=resources.me;
					break;
					case 1:
						img=resources.ship;
					break;
					case 2:
						img=resources.meteorite;
					break;
					default://case 3:
						img=resources.projectile;
					break;
				}
				ctx.save();
				ctx.translate(entity.x+(img.width/2),entity.y+(img.height/2));
				ctx.rotate(entity.direction);
				ctx.drawImage(img,-(img.width/2),-(img.height/2));
				ctx.restore();
			}
			function drawBg(ctx){
				var xx=(-((player.x/3)%resources.bg.width));//var xx=(player.x-(player.x%resources.bg.width));
				var yy=(-((player.y/3)%resources.bg.height));//var yy=(player.y-(player.y%resources.bg.height));
				var xn=0,yn=0;
				ctx.drawImage(resources.bg,xx,yy);
				if(xx>0){
					ctx.drawImage(resources.bg,xx-resources.bg.width,yy);
				}
				else if(xx+resources.bg.width<800){
					ctx.drawImage(resources.bg,xx+resources.bg.width,yy);
				}
				if(yy>0){
					ctx.drawImage(resources.bg,xx,yy-resources.bg.height);
				}
				else if(yy+resources.bg.height<600){
					ctx.drawImage(resources.bg,xx,yy+resources.bg.height);
				}
				if(xx>0 && yy>0){
					ctx.drawImage(resources.bg,xx-resources.bg.width,yy-resources.bg.height);
				}
				else if(xx+resources.bg.width<800 && yy+resources.bg.height<600){
					ctx.drawImage(resources.bg,xx+resources.bg.width,yy+resources.bg.height);
				}
			}
			function screen(txt){
				//alert(txt);
				var canvas = document.getElementById("canvas");
				var ctx=canvas.getContext('2d');
				ctx.fillStyle = "rgb(0,0,0)";
        		ctx.fillRect (0, 0, 800, 600);//clear
        		ctx.font = "bold 28px Arial";
        		ctx.fillStyle = "white";
  				ctx.fillText(txt, 32, 286);
			}
