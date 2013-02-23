#!/usr/bin/env python

import struct
import SocketServer
import json
from base64 import b64encode
from hashlib import sha1
from mimetools import Message
from StringIO import StringIO
import thread
import logging
import time
import math
import random
import copy

players = []
entities = []
asteroids = []

def createAsteroid():
	asteroid = {}
	asteroid["type"]="a"
	asteroid["time"]=time.time()*1000
	asteroid["x"]=random.randrange(-700,700)
	asteroid["y"]=random.randrange(-700,700)
	asteroid["d"]=random.randrange(-99,99)/47
	asteroid["v"]=random.randrange(0,300)/2.5
	asteroid["life"]=60*1000+random.randrange(-3*100,4*100)*10
	asteroids.append(asteroid)
	msg = asteroid
	msg["eid"]=asteroids.index(asteroid)
	sendtoall(msg,None)
	
def tellAboutAsteroids(player):
	for a in asteroids:
		a["eid"]=asteroids.index(a)
		player.send_message(jsone.encode(a))
	
bot = {}
bot["type"]="m"
bot["x"]=100	
bot["y"]=100
bot["v"]=0
bot["d"]=0
bot["pid"]=999
bot["time"]=time.time()*1000
def tellAboutBot(player):
	player.send_message(jsone.encode(bot))

class Vector:
    'Represents a 2D vector.'
    def __init__(self, x = 0, y = 0):
        self.x = float(x)
        self.y = float(y)
        
    def __add__(self, val):
        return Point( self[0] + val[0], self[1] + val[1] )
    
    def __sub__(self,val):
        return Point( self[0] - val[0], self[1] - val[1] )
    
    def __iadd__(self, val):
        self.x = val[0] + self.x
        self.y = val[1] + self.y
        return self
        
    def __isub__(self, val):
        self.x = self.x - val[0]
        self.y = self.y - val[1]
        return self
    
    def __div__(self, val):
        return Point( self[0] / val, self[1] / val )
    
    def __mul__(self, val):
        return Point( self[0] * val, self[1] * val )
    
    def __idiv__(self, val):
        self[0] = self[0] / val
        self[1] = self[1] / val
        return self
        
    def __imul__(self, val):
        self[0] = self[0] * val
        self[1] = self[1] * val
        return self
                
    def __getitem__(self, key):
        if( key == 0):
            return self.x
        elif( key == 1):
            return self.y
        else:
            raise Exception("Invalid key to Point")
        
    def __setitem__(self, key, value):
        if( key == 0):
            self.x = value
        elif( key == 1):
            self.y = value
        else:
            raise Exception("Invalid key to Point")
        
    def __str__(self):
        return "(" + str(self.x) + "," + str(self.y) + ")"
	def len(self):
		return Length(self)
Point = Vector
        
def DistanceSqrd( point1, point2 ):
    'Returns the distance between two points squared. Marginally faster than Distance()'
    return ( (point1[0]-point2[0])**2 + (point1[1]-point2[1])**2)
def Distance( point1, point2 ):
    'Returns the distance between two points'
    return math.sqrt( DistanceSqrd(point1,point2) )
def LengthSqrd( vec ):
    'Returns the length of a vector sqaured. Faster than Length(), but only marginally'
    return vec[0]**2 + vec[1]**2
def Length( vec ):
    'Returns the length of a vector'
    return math.sqrt( LengthSqrd(vec) )
def Normalize( vec ):
    'Returns a new vector that has the same direction as vec, but has a length of one.'
    if( vec[0] == 0. and vec[1] == 0. ):
        return Vector(0.,0.)
    return vec / Length(vec)
def Dot( a,b ):
    'Computes the dot product of a and b'
    return a[0]*b[0] + a[1]*b[1]
def ProjectOnto( w,v ):
    'Projects w onto v.'
    return v * Dot(w,v) / LengthSqrd(v)

def closest_point_on_seg(seg_a, seg_b, circ_pos):
	seg_v = seg_b - seg_a
	pt_v = circ_pos - seg_a
	if Length(seg_v) <= 0:
		raise ValueError, "Invalid segment length"
	seg_v_unit = seg_v / Length(seg_v)
	proj = Dot(seg_v,seg_v_unit)
	if proj <= 0:
		return seg_a
	if proj >= Length(seg_v):
		return seg_b
	proj_v = seg_v_unit * proj
	closest = proj_v + seg_a
	return closest

def segment_circle(seg_a, seg_b, circ_pos, circ_rad):
	closest = closest_point_on_seg(seg_a, seg_b, circ_pos)
	dist_v = circ_pos - closest
	if Length(dist_v) > circ_rad:
		return False
	return True

jsond = json.JSONDecoder()
jsone = json.JSONEncoder()

def sendtoall(object, ignore):
	msg = jsone.encode(object)
	for p in players:
		if not p == ignore:
			p.send_message(msg)

class WebSocketsHandler(SocketServer.StreamRequestHandler):
	magic = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

	def setup(self):
		SocketServer.StreamRequestHandler.setup(self)
		print "connection established", self.client_address
		self.handshake_done = False
		self.lastX=0
		self.lastY=0
		self.lastDir=0
		self.lastV=0
		self.lastUpdate=0
		self.pUpdate=0
		self.pX=0
		self.pY=0
		self.score=0
	def handle(self):
		try:
			while True:
				if not self.handshake_done:
					self.handshake()
				else:
					self.read_next_message()
		except Exception as e:
			try:
				msg={}
				msg["pid"]=players.index(self)
				players.remove(self)
				msg["type"]="r"
				msgt=jsone.encode(msg)
				for p in players:
					p.send_message(msgt)
			except Exception:
				pass
			print "Player disconnected ("+str(len(players))+"), reason "+str(type(e))
			if(not type == IndexError):
				logging.exception("detailed error")
			
	def read_next_message(self):
		length = ord(self.rfile.read(2)[1]) & 127
		if length == 126:
			length = struct.unpack(">H", self.rfile.read(2))[0]
		elif length == 127:
			length = struct.unpack(">Q", self.rfile.read(8))[0]
		masks = [ord(byte) for byte in self.rfile.read(4)]
		decoded = ""
		for char in self.rfile.read(length):
			decoded += chr(ord(char) ^ masks[len(decoded) % 4])
		self.on_message(decoded)

	def send_message(self, message):
		self.request.send(chr(129))
		length = len(message)
		if length <= 125:
			self.request.send(chr(length))
		elif length >= 126 and length <= 65535:
			self.request.send(chr(126))
			self.request.send(struct.pack(">H", length))
		else:
			self.request.send(chr(127))
			self.request.send(struct.pack(">Q", length))
		self.request.send(message)

	def handshake(self):
		data = self.request.recv(1024).strip()
		headers = Message(StringIO(data.split('\r\n', 1)[1]))
		if headers.get("Upgrade", None) != "websocket":
			return
		print 'Handshaking...'
		key = headers['Sec-WebSocket-Key']
		digest = b64encode(sha1(key + self.magic).hexdigest().decode('hex'))
		response = 'HTTP/1.1 101 Switching Protocols\r\n'
		response += 'Upgrade: websocket\r\n'
		response += 'Connection: Upgrade\r\n'
		response += 'Sec-WebSocket-Accept: %s\r\n\r\n' % digest
		self.handshake_done = self.request.send(response)
		if self.handshake_done:
			me = {}
			me["type"]="m"
			me["time"]=time.time()
			me["x"]=0
			me["y"]=0
			me["d"]=0
			me["v"]=0
			players.append(self)
			me["pid"]=players.index(self)
			memsg=jsone.encode(me)
			for p in players:
				if not p == self:
					other = {}
					other["type"]="m"
					other["time"]=p.lastUpdate
					other["x"]=p.lastX
					other["y"]=p.lastY
					other["d"]=p.lastDir
					other["v"]=p.lastV
					other["pid"]=players.index(p)
					self.send_message(jsone.encode(other))
					p.send_message(memsg)
			tellAboutAsteroids(self)
			tellAboutBot(self)
			print "Player connected ("+str(len(players))+")"
	def on_message(self, message):
		msg = jsond.decode(message)
		#print msg#debug!!!
		type = msg["type"]
		#print type," ",players.index(self)
		if type=="d":
			resp = msg
			resp["pid"]=players.index(self)
			self.lastDir=msg["d"]
			sendtoall(resp,self)
		elif type=="m":
			maxD=(time.time()-self.lastUpdate)*218+15
			x=msg["x"]
			y=msg["y"]
			if msg["time"]/1000+5>time.time() and msg["time"]/1000-5<time.time() and (self.lastX-x)*(self.lastX-x)+(self.lastY-y)*(self.lastY-y)<=maxD*maxD:
				resp = msg
				resp["pid"]=players.index(self)
				sendtoall(resp,self)
				self.lastX=x
				self.lastY=y
				self.lastUpdate=time.time()
				self.lastDir=msg["d"]
				self.lastV=msg["v"]
			else:
				msg = {}
				msg["type"]="f"
				msg["x"]=self.lastX
				msg["y"]=self.lastY
				self.send_message(jsone.encode(msg))
				print "hacking"
		elif type=="s":
			maxD=(time.time()-self.lastUpdate)*215+35
			x=msg["x"]
			y=msg["y"]
			if msg["time"]/1000+5>time.time() and msg["time"]/1000-5<time.time() and (self.lastX-x)*(self.lastX-x)+(self.lastY-y)*(self.lastY-y)<=maxD*maxD:
				resp = msg
				msg["u"]=time.time()
				msg["pid"]=players.index(self)
				msg["life"]=2.5
				entities.append(msg)
				resp["eid"]=entities.index(msg)
				sendtoall(resp,None)
				if self.score>=10:
					resp = copy.copy(resp)
					resp["d"]-=math.radians(5)
					entities.append(resp)
					resp["eid"]=entities.index(resp)
					sendtoall(resp,None)
					r2 = copy.copy(resp)
					r2["d"]+=math.radians(10)
					entities.append(r2)
					r2["eid"]=entities.index(r2)
					sendtoall(r2,None)
			else:
				msg = {}
				msg["type"]="f"
				msg["x"]=self.lastX
				msg["y"]=self.lastY
				self.send_message(jsone.encode(msg))

def runLogic():
	now=time.time()
	print "Physics..."
	while True:
		try:
			last=now
			now=time.time()
			for p in players:
				if p.lastV>0:
					dt=now-p.pUpdate
					if p.lastV<180:
						p.lastV-=dt*1000/150
					if p.lastUpdate>p.pUpdate:
						p.pX=p.lastX
						p.pY=p.lastY
						p.pUpdate=p.lastUpdate
					p.pX+=math.cos(p.lastDir)*(p.lastV*dt+20)
					p.pY+=math.sin(p.lastDir)*(p.lastV*dt+20)
					p.pUpdate=now
			for e in entities:
				dt=now-e["u"]
				e["life"]-=dt
				if e["life"]<=0:
					entities.remove(e)
					continue
				lastX=e["x"]
				lastY=e["y"]
				e["x"]+=math.cos(e["d"])*e["v"]*dt
				e["y"]+=math.sin(e["d"])*e["v"]*dt
				e["u"]=now
				a=Vector(lastX,lastY)
				b=Vector(e["x"]+math.cos(e["d"])*24,e["y"]+math.sin(e["d"])*24)
				if e["pid"]!=999 and segment_circle(a,b,Vector(bot["x"],bot["y"]),28):
					msg = {}
					msg["type"]="b"
					msg["eid"]=entities.index(e)
					sendtoall(msg,None)
					msg = {}
					msg["type"]="m"
					msg["time"]=time.time()*1000
					msg["x"]=0
					msg["y"]=0
					msg["v"]=0
					msg["d"]=0
					msg["pid"]=999
					sendtoall(msg,None)
					bot["x"]=0
					bot["y"]=0
					bot["v"]=0
					bot["d"]=0
					msg={}
					msg["type"]="c"
					players[e["pid"]].score+=1
					msg["score"]=players[e["pid"]].score
					players[e["pid"]].send_message(jsone.encode(msg))
					entities.remove(e)
				else:
					for p in players:
						ind = players.index(p)
						if e["pid"]!=ind and segment_circle(a,b,Vector(p.pX,p.pY),28):#if (not e["pid"]==ind) and segment_circle(a,b,Vector(p.pX,p.pY),28):
							#print "!!!Player killed!!!"
							msg = {}
							msg["type"]="b"
							msg["eid"]=entities.index(e)
							sendtoall(msg,None)
							msg = {}
							msg["type"]="m"
							msg["time"]=time.time()*1000
							msg["x"]=0
							msg["y"]=0
							msg["v"]=0
							msg["d"]=p.lastDir
							msg["pid"]=ind
							sendtoall(msg,p)
							msg = {}
							msg["type"]="f"
							msg["x"]=0
							msg["y"]=0
							p.lastX=0
							p.lastY=0
							p.pX=0
							p.pY=0
							p.lastV=0
							p.send_message(jsone.encode(msg))
							msg = {}
							msg["type"]="t"
							msg["txt"]="Game over."
							p.send_message(jsone.encode(msg))
							if e["pid"]!=999:
								msg={}
								msg["type"]="c"
								players[e["pid"]].score+=1
								msg["score"]=players[e["pid"]].score
								players[e["pid"]].send_message(jsone.encode(msg))
							entities.remove(e)
							break
			ddt=now-last
			for a in asteroids:
				a["life"]-=ddt*1000
				if a["life"]<=0:
					asteroids.remove(a)
					del a
			if len(asteroids)<40:
				#print "Yes"
				for i in range(0,40-len(asteroids)):
					createAsteroid()
					#print "Creation"
			if len(players)>0:
				dtt=now-bot["time"]/1000
				bot["time"]=now*1000
				lastV=bot["v"]
				lastD=bot["d"]
				pl=None
				d=900*900
				for p in players:
					dx=bot["x"]-p.pX
					dy=bot["y"]-p.pY
					if dx*dx+dy*dy<d:
						d=dx*dx+dy*dy
						pl=p
				if pl!=None:
					dx=pl.pX-bot["x"]
					dy=pl.pY-bot["y"]
					if dx>0:
						bot["d"]=math.atan(dy/dx)
					elif dx<0:
						bot["d"]=math.pi-math.atan(-dy/dx)
					bot["v"]=50
				else:
					bot["v"]=0
				if lastV!=bot["v"] or bot["d"]!=lastD:
					for p in players:
						tellAboutBot(p)
				bot["x"]+=math.cos(bot["d"])*dtt*bot["v"]
				bot["y"]+=math.sin(bot["d"])*dtt*bot["v"]
				if random.randrange(30*5)==1:
					sh={}
					sh["type"]="s"
					sh["x"]=bot["x"]
					sh["y"]=bot["y"]
					sh["d"]=bot["d"]
					sh["v"]=120
					sh["time"]=now*1000
					sh["eid"]=9999
					sendtoall(sh,None)
					sh["pid"]=999
					sh["life"]=2.5
					sh["u"]=now
					entities.append(sh)
			if len(players)<=0:
				bot["x"]=0
				bot["y"]=0
				bot["v"]=0
				bot["time"]=now*1000
				time.sleep(1)
			time.sleep(0.033)
		except Exception:
			print "Houston!"
			logging.exception("WHoah!!")
class Server(SocketServer.ThreadingMixIn, SocketServer.TCPServer):
	pass
if __name__ == "__main__":
	server = Server(("", 9999), WebSocketsHandler)
	print "Listening on 9999..."
	thread.start_new_thread(runLogic,())
	server.serve_forever()
	server.server_close();
	print "bye!"
