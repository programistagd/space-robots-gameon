		var ip="188.116.4.138";
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
        bg: 'imgs/bg.png',
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
				socket = new WebSocket("ws://"+ip+":9999/");
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
					var msg = JSON.parse(evt.data);
					//console.log(msg);
					switch(msg.type){
						case 'm':
							var id=msg.pid;
							players[id] = {
								x: msg.x,
								y: msg.y,
								velocity: msg.v,
								direction: msg.d,
								resId: 1
							};
							velocity(players[id],lastUpdate.getTime()-msg.time);
							//console.log(Object.keys(players).length)
							players[id].life=4*60*1000;
						break;
						case 'd':
							var id=msg.pid;
							var dt=lastUpdate-msg.time;
							if(players[id]!=undefined){
								velocity(players[id],-dt);
								players[id].direction=msg.d;
								velocity(players[id],dt);
								players[id].life=4*60*1000;
							}
						break;
						case 's':
							entities[msg.eid] = {
								resId: 3,
								x: msg.x,
								y: msg.y,
								velocity: msg.v,
								direction: msg.d,
								life: 1000*2.5,
							};
							//console.log(entities[msg.eid]);
							entities[msg.eid].life-=(lastUpdate.getTime()-msg.time);
							velocity(entities[msg.eid],lastUpdate.getTime()-msg.time);
						break;
						case 'a':
							entities[msg.eid] = {
								resId: 2,
								x: msg.x,
								y: msg.y,
								velocity: msg.v,
								direction: msg.d,
								life: 1000*60,
							};
							//console.log(entities[msg.eid]);
							entities[msg.eid].life-=(lastUpdate.getTime()-msg.time);
							velocity(entities[msg.eid],lastUpdate.getTime()-msg.time);
						break;
						case 'r':
							//players.remove(msg.pid);
							delete players[msg.pid];
						break;
						case 'b':
							//entities[msg.eid].resId=2;
							//entities[msg.eid].velocity=0;
							delete entities[msg.eid]
						break
						case 'f':
							player.x=msg.x;
							player.y=msg.y;
							player.velocity=0;
						break
						case 't':
							dead=true;
							screen(msg.txt+"    Press Z to continue");
						break
						case 'c':
							{
								document.getElementById("score").innerHTML = "Score: "+msg.score+" destroyed robots";
							}
						break
					}
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
					if (dead){
						dead=false;
						return;
					}
					if(cooldown<=0){
						shoot()
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
		window.addEventListener('keydown',window.onKeyDown,true);
		window.addEventListener('keyup',window.onKeyUp,true);
		document.addEventListener('keydown',window.onKeyDown,true);
		document.addEventListener('keyup',window.onKeyUp,true);
		//Game	
		var lastV=0,lastD=0, hyperDriveUpdate=0;
		var load=0;
		var dead=false;
			var player = {
				direction: 0,
				velocity: 0,
				x: 0,
				y: 0,
				resId: 0
			};
			var entities={}, players={};
			
			var lastUpdate;
			
			function shoot(){
				if(cooldown<=0){
						var msg = {
							type: "s",
							x: player.x+Math.cos(player.direction)*28,
							y: player.y+Math.sin(player.direction)*28,
							v: player.velocity+100,
							d: player.direction,
							time: lastUpdate.getTime()
						};
						socket.send(JSON.stringify(msg));
						cooldown=320;
					}
			}
			
			function update(){
				if(dead){
					return;
				}
				var now = new Date()
				var dt = now.getTime()-lastUpdate.getTime();//delta time
				lastUpdate=now;
				//update events
				if(up){
					player.velocity+=dt/10;
				}
				if(down){
					player.velocity-=dt/10;
				}
				if(right){
					player.direction+=dt/360;
				}
				if(left){
					player.direction-=dt/360;
				}
				//endof events
				if(document.getElementById("doUpdate").checked){
					eval(document.getElementById("code").value);
				}
				if(player.velocity>200){
					player.velocity=200;
				}
				if(player.velocity<0){
					player.velocity=0;
				}
				//network
				if(player.velocity!=lastV){
					var msg = {
						type: "m",
						x: player.x,
						y: player.y,
						v: player.velocity,
						d: player.direction,
						time: lastUpdate.getTime()
					};
					socket.send(JSON.stringify(msg));
					lastV=player.velocity;
					lastD=player.direction;
					hyperDriveUpdate=0;
				}
				else if(player.direction!=lastD){
					if(hyperDriveUpdate>=50){//timeout of sending pos update when moving fast and changing direction a lot which causes calc errors at other players
						var msg = {
							type: "m",
							x: player.x,
							y: player.y,
							v: player.velocity,
							d: player.direction,
							time: lastUpdate.getTime()
						};
						socket.send(JSON.stringify(msg));
						lastV=player.velocity;
						lastD=player.direction;
						hyperDriveUpdate=0;
					}else{
						var msg = {
							type: "d",
							d: player.direction,
							time: lastUpdate.getTime()
						};
						socket.send(JSON.stringify(msg));
						lastD=player.direction;
						if(player.velocity>=180){
							hyperDriveUpdate+=1;
						}
					}
				}
				if(player.velocity<180){
					player.velocity-=dt/150;//friction
					if(player.velocity<0){
						player.velocity=0;
					}
					lastV=player.velocity;
				}
				
				//end
				cooldown-=dt;
				velocity(player,dt); //"physics"
				for(var e in entities){
					velocity(entities[e],dt);
					entities[e].life-=dt;
					if(entities[e].life<=0){
						delete entities[e];
					}
				}
				for(var e in players){
					if(players[e].velocity<180){
						players[e].velocity-=dt/150;//friction
						if(players[e].velocity<0){
							players[e].velocity=0;
						}
						players[e].life-=dt;
						if(players[e].life<=0){
							delete players[e];
						}
					}
					velocity(players[e],dt);
				}
				redraw();//self-explanatory :)
			}
			
			function velocity(entity,dt){
				if(entity!=undefined){
					entity.x+=Math.cos(entity.direction)*entity.velocity*dt/1000;
					entity.y+=Math.sin(entity.direction)*entity.velocity*dt/1000;
				}
			}
		//Graphics	
			function redraw(){
				var canvas = document.getElementById("canvas");
				var ctx=canvas.getContext('2d');
				ctx.save();
				ctx.fillStyle = "rgb(0,0,0)";
        		ctx.fillRect (0, 0, 800, 600);//clear
        		drawBg(ctx);
        		ctx.translate(-player.x+400,-player.y+300);
        		for(var e in entities){
        			//console.log(entities[e]);
        			drawEntity(ctx,entities[e]);
        		}
        		for(var e in players){
        			drawEntity(ctx,players[e]);
        		}
        		drawEntity(ctx,player);
				ctx.restore();
			}
			function drawEntity(ctx,entity){
				if(entity!=undefined){
					var img;
					switch(entity.resId){
						case 0:
							img=resources.me;
						break;
						case 1:
							img=resources.ship;
						break;
						case 2:
							img=resources.meteor;
						break;
						default://case 3:
							img=resources.projectile;
						break;
					}
					ctx.save();
					//if(entity.resId>2){console.log(entity);}
					ctx.translate(entity.x,entity.y);
					ctx.rotate(entity.direction);
					ctx.drawImage(img,-(img.width/2),-(img.height/2));
					ctx.restore();
				}
			}
			function drawBg(ctx){
				var xx=(-((player.x/3)%resources.bg.width));//var xx=(player.x-(player.x%resources.bg.width));
				var yy=(-((player.y/3)%resources.bg.height));//var yy=(player.y-(player.y%resources.bg.height));
				var xn=0,yn=0;
				ctx.drawImage(resources.bg,xx,yy);
				if(xx>=0){
					ctx.drawImage(resources.bg,xx-resources.bg.width,yy);
				}
				else if(xx+resources.bg.width<=800){
					ctx.drawImage(resources.bg,xx+resources.bg.width,yy);
				}
				if(yy>=0){
					ctx.drawImage(resources.bg,xx,yy-resources.bg.height);
				}
				else if(yy+resources.bg.height<=600){
					ctx.drawImage(resources.bg,xx,yy+resources.bg.height);
				}
				if(xx>=0 && yy>=0){
					ctx.drawImage(resources.bg,xx-resources.bg.width,yy-resources.bg.height);
				}
				else if(xx>=0 && yy+resources.bg.height<=600){
					ctx.drawImage(resources.bg,xx-resources.bg.width,yy+resources.bg.height);
				}
				else if(yy>=0 && xx+resources.bg.width<=800){
					ctx.drawImage(resources.bg,xx+resources.bg.width,yy-resources.bg.height);
				}
				else if(xx+resources.bg.width<=800 && yy+resources.bg.height<=600){
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
