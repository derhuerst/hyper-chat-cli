'use strict'

const airswarm = require('airswarm')

const findPeers = (discoveryKey, onPeer) => {
	airswarm(discoveryKey.toString('hex'), (peer) => {
		if (peer.connecting) peer.once('connect', () => onPeer(peer))
		else onPeer(peer)
	})

	const nrOfPeers = () => swarm.peers.length
	return nrOfPeers
}

module.exports = findPeers
