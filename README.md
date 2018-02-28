# Aircraft map

Interactive map that shows planes within radio range via ADS-B.

## Usage

1. Acquire an [ADS-B receiver][adsb] and [antenna][antenna].

1. Hook up acquired gear and run [dump1090][dump1090]. I'm using antirez's original
   repo but there are a couple of forks with extended functionality that may
   also work as well.

1. Create an [Amazon Kinesis][kinesis] stream called `1090`.

1. Run `adsb2kinesis`:

    ```console
    cd adsb2kinesis && AWS_REGION=your-region go run main.go
    ```

1. Create an [Amazon Cognito][cognito] identity pool with an unauthenticated role.
   Grant that unauthenticate role permission to `GetRecords` from your stream.

1. Use your Cognito Identity Pool ID in `dashboard.js`. You probably also want
   to change the map center coordinates to where ever you are.

1. `open index.html`

    ![](media/planes.png)

[adsb]: https://www.amazon.com/FlightAware-Pro-Stick-ADS-B-Receiver/dp/B01D1ZAP3C
[antenna]: https://www.amazon.com/1090Mhz-Antenna-Connector-2-5dbi-Adapter/dp/B013S8B234
[dump1090]: https://github.com/antirez/dump1090
[kinesis]: https://aws.amazon.com/kinesis/
[cognito]: https://aws.amazon.com/cognito/
