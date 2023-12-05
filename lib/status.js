'use strict';

var Common = require('./common');

function StatusController(node) {
  this.node = node;
  this.common = new Common({log: this.node.log});
}

StatusController.prototype.show = function(req, res) {
  var self = this;
  var option = req.query.q;

  switch(option) {
  case 'getDifficulty':
    this.getDifficulty(function(err, result) {
      if (err) {
        return self.common.handleErrors(err, res);
      }
      res.jsonp(result);
    });
    break;
  case 'getLastBlockHash':
    res.jsonp(this.getLastBlockHash());
    break;
  case 'getBestBlockHash':
    this.getBestBlockHash(function(err, result) {
      if (err) {
        return self.common.handleErrors(err, res);
      }
      res.jsonp(result);
    });
    break;
  case 'getInfo':
  default:
    this.getInfo(function(err, result) {
      if (err) {
        return self.common.handleErrors(err, res);
      }
      res.jsonp({
        info: result
      });
    });
  }
};

StatusController.prototype.getInfo = function(callback) {
  this.node.services.bitcoind.getInfo(function(err, result) {
    if (err) {
      return callback(err);
    }
    var info = {
      version: result.version,
      protocolversion: result.protocolVersion,
      blocks: result.blocks,
      timeoffset: result.timeOffset,
      connections: result.connections,
      proxy: result.proxy,
      difficulty: result.difficulty,
      testnet: result.testnet,
      relayfee: result.relayFee,
      errors: result.errors,
      network: result.network
    };
    callback(null, info);
  });
};

StatusController.prototype.getLastBlockHash = function() {
  var hash = this.node.services.bitcoind.tiphash;
  return {
    syncTipHash: hash,
    lastblockhash: hash
  };
};

StatusController.prototype.getBestBlockHash = function(callback) {
  this.node.services.bitcoind.getBestBlockHash(function(err, hash) {
    if (err) {
      return callback(err);
    }
    callback(null, {
      bestblockhash: hash
    });
  });
};

StatusController.prototype.getDifficulty = function(callback) {
  this.node.services.bitcoind.getInfo(function(err, info) {
    if (err) {
      return callback(err);
    }
    callback(null, {
      difficulty: info.difficulty
    });
  });
};

StatusController.prototype.sync = function(req, res) {
  var self = this;
  var status = 'syncing';

  this.node.services.bitcoind.isSynced(function(err, synced) {
    if (err) {
      return self.common.handleErrors(err, res);
    }
    if (synced) {
      status = 'finished';
    }

    self.node.services.bitcoind.syncPercentage(function(err, percentage) {
      if (err) {
        return self.common.handleErrors(err, res);
      }
      var info = {
        status: status,
        blockChainHeight: self.node.services.bitcoind.height,
        syncPercentage: Math.round(percentage),
        height: self.node.services.bitcoind.height,
	totalCoin: self.getTotalCoin(self.node.services.bitcoind.height)/1e5,
        error: null,
        type: 'bitcore node'
      };

      res.jsonp(info);

    });

  });

};

// Hard coded to make insight ui happy, but not applicable
StatusController.prototype.totalcoin = function(req, res) {
  var self = this;
  var text = self.getTotalCoin(self.node.services.bitcoind.height)/1e5;
  res.jsonp(text );

 
};

StatusController.prototype.peer = function(req, res) {
  
  res.jsonp({
    connected: true,
    host: '127.0.0.1',
    port: null
  });

 
};

StatusController.prototype.version = function(req, res) {
  var pjson = require('../package.json');
  res.jsonp({
    version: pjson.version
  });
};

StatusController.prototype.getTotalCoin = function(height) {
  var subsidy = 50 * 1e8;
  var originSubsidy = 50 * 1e8;
  if(height>=512666) subsidy = 10 * 1e8;
  var halvings = 0;
  if(height>=512666)
    {
      halvings = Math.floor( (512666+(height-512666)/5)/210000 );
    } else
    {
      halvings = Math.floor(height/210000);
    }
    subsidy = subsidy/Math.pow(2,halvings); 
  // if(height==512666)  subsidy = 210000000 * 1e5;
  // Force block reward to zero when right shift is undefined.
    if (halvings >= 64) {
     subsidy =0;
    }
	
      
	var totalSubsidy = 0;
	var i = 0;
	var totalCoin = 0;
	if(height< 512666)
	{
		for(;i< halvings;i++)
		{
		   totalSubsidy += originSubsidy/Math.pow(2,i);	
		}
		totalCoin += totalSubsidy * 210000;
		totalCoin += (height%210000) * subsidy;
	}
    else 
	{
		for(;i< halvings;i++)
		{
            totalSubsidy += originSubsidy/Math.pow(2,i);	
		}
		totalCoin += totalSubsidy * 210000;
		totalCoin += 210000000 * 1e5 - 12.5* 1e8;
		
		totalCoin += Math.floor(512666+(height-512666)/5) %210000 * subsidy * 5;
        totalCoin += (height-512666)%5 * subsidy;
	}	
  // Subsidy is cut in half every 210,000 blocks which will occur approximately every 4 years.
	
    return totalCoin;
};




module.exports = StatusController;

