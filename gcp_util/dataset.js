const { AutoMlClient } = require("@google-cloud/automl").v1;
const short = require("short-uuid");

class Dataset {
  constructor(props) {
    this.projectId = props.projectId;
    this.location = props.location;
    this.creationInProgress = false;
    this.creationOperationId = null;
    if (props.datasetId === undefined) {
      this.id = null;
      this.createDataset();
    } else {
      // TODO: check that dataset with this.id actually exists
      this.id = props.datasetId;
      this.creationPromise = Promise.resolve();
    }
  }

  async createDataset() {
    if (this.id === null && this.creationInProgress === false) {
      this.creationInProgress = true;

      const client = new AutoMlClient();

      const request = {
        parent: client.locationPath(this.projectId, this.location),
        dataset: {
          displayName: "dataset_" + short.generate(),
          textClassificationDatasetMetadata: {
            classificationType: "MULTICLASS",
          },
        },
      };

      const [operation] = await client.createDataset(request);
      this.creationOperationId = operation.name
        .split("/")
        [operation.name.split("/").length - 1].split("\n")[0];

      this.creationPromise = operation
        .promise()
        .then(([response]) => {
          this.id = response.name
            .split("/")
            [response.name.split("/").length - 1].split("\n")[0];
          this.creationInProgress = false;
          this.creationOperationId = null;

          console.log(`Dataset name: ${this.name}`);
          console.log(`Dataset id: ${this.id}`);
        })
        .catch((err) => {
          this.creationInProgress = false;
          this.creationOperationId = null;
          console.log(err);
        });
    } else {
      if (this.creationInProgress === true) {
        console.log(`Dataset is being created.`);
      } else {
        console.log(`Dataset has already been created. Dataset ID: ${this.id}`);
      }
    }
  }

  async waitForCreationCompletion(callback) {
    await this.trainingPromise;
    // BUG: If creation is unsuccessful, the callback with still run.
    callback();
  }

  async importDatasetItems(bucketName, fileName) {
    await this.creationPromise;

    const client = new AutoMlClient();

    const path = `gs://${bucketName}/${fileName}`;
    const request = {
      name: client.datasetPath(this.projectId, this.location, this.id),
      inputConfig: {
        gcsSource: {
          inputUris: path.split(","),
        },
      },
    };

    // Import dataset
    console.log("Proccessing import");
    const [operation] = await client.importData(request);

    // Wait for operation to complete.
    const [response] = await operation.promise();
    console.log(`Dataset imported: ${response}`);
  }

  getId() {
    return this.id;
  }
}

// const bucketName = "softblocker-lcm";
// const projectId = "softblocker";
// const location = "us-central1";
// const collectionName = "profiles";
// const operationId = "TCN4745457550864941056";
// const datasetId = "TCN1195179034997161984";


const test = () => {
  dataset = new Dataset("softblocker", "us-central1", "test_4");
  dataset.importDatasetItems("softblocker-lcm", "Homer.csv");
};

test();

module.exports = Dataset;
