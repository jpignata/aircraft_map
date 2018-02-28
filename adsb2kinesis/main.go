package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/kinesis"
)

const (
	streamName       = "1090"
	pollFreq         = 500
	dump1090Endpoint = "http://localhost:8080/data.json"
)

type Aircraft struct {
	Hex       string    `json:"hex"`
	Flight    string    `json:"flight"`
	Latitude  float64   `json:"lat"`
	Longitude float64   `json:"lon"`
	Altitude  int       `json:"altitude"`
	Track     int       `json:"track"`
	Speed     int       `json:"speed"`
	UpdatedAt time.Time `json:"updated_at"`
}

func main() {
	sess := session.Must(session.NewSession())
	client := kinesis.New(sess)
	ticker := time.NewTicker(time.Millisecond * pollFreq)

	for _ = range ticker.C {
		var entries []*kinesis.PutRecordsRequestEntry

		for _, aircraft := range poll() {
			json, err := json.Marshal(aircraft)

			if err != nil {
				log.Printf("Error: %+v\n", err)
				break
			}

			entry := &kinesis.PutRecordsRequestEntry{
				Data:         []byte(json),
				PartitionKey: aws.String(aircraft.Hex),
			}

			entries = append(entries, entry)
		}

		_, err := client.PutRecords(
			&kinesis.PutRecordsInput{
				StreamName: aws.String(streamName),
				Records:    entries,
			},
		)

		if err != nil {
			log.Printf("Error: %+v\n", err)
		}
	}
}

func poll() []Aircraft {
	aircraft := []Aircraft{}
	resp, err := http.Get(dump1090Endpoint)

	if err != nil {
		log.Printf("Error: %+v\n", err)
		return aircraft
	}

	decoder := json.NewDecoder(resp.Body)
	defer resp.Body.Close()

	if err := decoder.Decode(&aircraft); err != nil {
		log.Printf("Error: %+v\n", err)
		return aircraft
	}

	return aircraft
}
