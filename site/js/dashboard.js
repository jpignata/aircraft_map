'use strict';

(function() {
  const Dashboard = {};

  Dashboard.Map = function(L) {
    const circleColor = 'blue';
    const circleRadius = 10;
    const gcFrequency = 1000;
    const iconSize = 30;
    const iconUrl = 'images/airplane-icon.png';
    const lineColor = 'orange';
    const mapAttribution = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>';
    const mapBoxAccessToken = 'pk.eyJ1IjoicGlnbmF0YWoiLCJhIjoiY2o3a2xrcDlxMHBxeTJxcW5wa2JlZW1mbyJ9.7dKS6nM8xwV-92s_3HMWtA';
    const mapBoxEndpoint = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}';
    const mapBoxLayerId = 'mapbox.streets';
    const mapCenter = [40.7348739, -74.3720929];
    const mapZoom = 9.5;
    const aircraftTimeout = 120000;

    return {
      init: function(divName) {
        this.icon = L.icon({
          iconSize: iconSize,
          iconUrl: iconUrl,
        });
        this.map = L.map(divName).setView(mapCenter, mapZoom);
        this.aircraft = {};

        L.circle(mapCenter, {
          color: circleColor,
          radius: circleRadius,
        }).addTo(this.map);

        garbageCollector(this.aircraft, this.map);

        return this;
      },

      render: function() {
        L.tileLayer(mapBoxEndpoint, {
          accessToken: mapBoxAccessToken,
          attribution: mapAttribution,
          id: mapBoxLayerId,
        }).addTo(this.map);

        return this;
      },

      update: function(status) {
        if (!this.aircraft.hasOwnProperty(status.hex)) {
          this.add(status);
        }

        const aircraft = this.aircraft[status.hex];
        const popUpMsg = `
          <p id="popUpName"><a href="https://flightaware.com/live/flight/${status.flight}" target="_blank">${status.flight}</a></p>

          <table id="popUpDetails">
            <tr>
              <td class="popUpDetailsHeader">Speed</td>
              <td>${status.speed} mph</td>
            </tr>
            <tr>
              <td class="popUpDetailsHeader">Altitude</td>
              <td>${status.altitude} feet</td>
            </tr>
          </table>
        `;

        aircraft.polyline.addLatLng([status.lat, status.lon]);
        aircraft.marker
          .setRotationAngle(status.track - 45)
          .setRotationOrigin('center center')
          .setLatLng([status.lat, status.lon])
          .bindPopup(popUpMsg);

        aircraft.lastStatusTime = new Date();

        return this;
      },

      add: function(status) {
        const aircraft = {};

        aircraft.polyline = L.polyline([[status.lat, status.lon]], {
          color: lineColor,
        }).addTo(this.map);
        aircraft.marker = L.marker([status.lat, status.lon], {
          icon: this.icon,
        }).setRotationAngle(status.track - 45).addTo(this.map);

        this.aircraft[status.hex] = aircraft;

        return this;
      }
    };

    function garbageCollector(aircraft, map) {
      setInterval(function() {
        Object.keys(aircraft).forEach(function(name) {
          const now = new Date().getTime();

          if (now - aircraft[name].lastStatusTime.getTime() > aircraftTimeout) {
            aircraft[name].polyline.removeFrom(map);
            aircraft[name].marker.removeFrom(map);

            delete aircraft[name];
          }
        });
      }, gcFrequency);
    }
  }

  Dashboard.Poller = function(kinesis, map, console) {
    const streamName = '1090';
    const shardIteratorType = 'LATEST';
    const pollFrequency = 1000;

    return {
      poll: function() {
        return describeStream(streamName)
          .then((data) => data.StreamDescription.Shards.map((shard) => shard.ShardId))
          .then((shardIds) => getShardIterators(shardIds))
          .then((data) => data.map((shardIterator) => shardIterator.ShardIterator))
          .then((shardIteratorIds) => getRecords(shardIteratorIds))
          .catch(console.error);
      }
    };

    function describeStream(streamName) {
      const params = {
        StreamName: streamName,
      };

      return kinesis.describeStream(params).promise();
    }

    function getShardIterators(shardIds) {
      const iterators = shardIds.map(function(shardId) {
        const params = {
          ShardId: shardId,
          ShardIteratorType: shardIteratorType,
          StreamName: streamName,
        };

        return kinesis.getShardIterator(params).promise();
      });

      return Promise.all(iterators);
    }

    function getRecords(shardIteratorIds) {
      const recordSets = shardIteratorIds.map(function(shardIteratorId) {
        const params = {
          ShardIterator: shardIteratorId,
        };

        return kinesis.getRecords(params).promise();
      });

      return Promise.all(recordSets)
        .then((recordSets) => update(recordSets))
        .then((recordSets) => recordSets.map((records) => records.NextShardIterator))
        .then((shardIteratorIds) => setTimeout(() => getRecords(shardIteratorIds), pollFrequency))
        .catch(function(err) {
          console.error(err);
          setTimeout(() => getRecords(shardIteratorIds), pollFrequency);
        });
    }

    function update(recordSets) {
      recordSets.forEach(function(records) {
        records.Records.forEach(function(record) {
          const status = JSON.parse(record.Data);

          map.update(status);
        });
      });

      return recordSets;
    }
  }

  $(window).on('load', function() {
    AWS.config.region = 'us-east-1';
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: 'us-east-1:fa81df44-d624-4aa3-b6c6-8327f0313db2',
    });

    const map = Dashboard.Map(L).init('map').render();
    const kinesis = new AWS.Kinesis({
      region: AWS.config.region,
    });

    Dashboard.Poller(kinesis, map, console).poll()
      .catch((err) => alert(err));
  });
})();
