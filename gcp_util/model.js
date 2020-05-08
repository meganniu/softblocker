const {
  AutoMlClient,
  PredictionServiceClient,
} = require("@google-cloud/automl").v1;

const short = require("short-uuid");

class Model {
  constructor(props) {
    this.projectId = props.projectId;
    this.datasetId = props.datasetId;
    this.location = props.location;
    this.trainingOperationId = null;
    this.trainingInProgress = false;

    if (props.modelId === undefined || props.modelId === null) {
      this.id = null;
      this.trainModel();
    } else {
      this.id = props.modelId;
      this.trainingPromise = Promise.resolve();
      // TODO: check that model with ID actually exists
    }
  }

  async trainModel() {
    if (this.id === null && this.trainingInProgress === false) {
      this.trainingInProgress = true;

      const client = new AutoMlClient();

      const request = {
        parent: client.locationPath(this.projectId, this.location),
        model: {
          displayName: "model_" + short.generate(),
          datasetId: this.datasetId,
          textClassificationModelMetadata: {}, // Leave unset to use the default base model
        },
      };

      const [operation] = await client.createModel(request);

      this.trainingOperationId = operation.name
        .split("/")
        [operation.name.split("/").length - 1].split("\n")[0];
      console.log(this.trainingOperationId);

      this.trainingPromise = operation
        .promise()
        .then(([response]) => {
          // TODO: handle case where response indicates model is not trained successfully.
          this.id = response.name
            .split("/")
            [response.name.split("/").length - 1].split("\n")[0];
          this.trainingInProgress = false;
          this.trainingOperationId = null;

          console.log(`Model name: ${this.name}`);
          console.log(`Model id: ${this.id}`);
        })
        .catch((err) => {
          this.trainingInProgress = false;
          this.trainingOperationId = null;
          console.log(err);
        });
    } else {
      if (this.trainingInProgress === true) {
        console.log(
          `Currently training model. Operation ID: ${this.trainingOperationId}`
        );
      } else {
        console.log(
          `Training already compeleted for model. Model ID: ${this.id}`
        );
      }
    }
  }

  async waitForTrainingCompletion(callback) {
    await this.trainingPromise;
    // BUG: If training is unsuccessful, the callback with still run.
    callback();
  }

  async classifyData(data) {
    await this.trainingPromise;
    // BUG: If training is unsuccessful, the func with attempt to classify data using a model that dne.
    const client = new PredictionServiceClient();

    const request = {
      name: client.modelPath(this.projectId, this.location, this.id),
      payload: {
        textSnippet: {
          content: data,
          mimeType: "text/plain",
        },
      },
    };

    const [response] = await client.predict(request);

    return response.payload.map((el) => {
      return { label: el.displayName, score: el.classification.score };
    });
  }

  getId() {
    return this.id;
  }

  isTraining() {
    return this.trainingInProgress;
  }

  getTrainingOperationId() {
    return this.trainingOperationId;
  }
}

// const scrape = require("../scrape/scrape.js");

// const bucketName = "softblocker-lcm";
// const projectId = "softblocker";
// const location = "us-central1";
// const collectionName = "profiles";
// const operationId = "TCN4745457550864941056";
// const datasetId = "TCN1195179034997161984";

// const test = async () => {
//   const model = new Model(
//     { projectId, location, datasetId }
//     // "TCN5269559009697857536"
//   );

//   // console.log(
//   //   await model.classifyData(
//   //     // await scrape("https://www.youtube.com/watch?v=1e7gy3fsJa8", false) // homer
//   //     await scrape("https://www.youtube.com/watch?v=VunWdHCjbI8", false) // homer simpson
//   //   )
//   // );
// };

// test();

module.exports = Model;
