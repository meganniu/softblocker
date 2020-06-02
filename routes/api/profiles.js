const express = require("express");
const Profile = require("../../profile");

const router = express.Router();

router.get("/:id", (req, res) => {
  const profile = new Profile({ id: req.params.id });
  profile
    .getCreationPromise()
    .then(() => {
      res.json(profile.getInfo());
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({
        msg: `Unable to get profile with ID ${req.params.id}`,
      });
    });
});

router.post("/:id/topics", (req, res) => {
  const topic = req.body.topic;
  const profile = new Profile({ id: req.params.id });
  profile
    .getCreationPromise()
    .then(() => {
      return profile.addTopic(topic);
    })
    .then(() => {
      res.json(profile.getTopics());
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({
        msg: `Unable to add topic "${topic}"`,
      });
    });
});

router.post("/:id/models", (req, res) => {
  const id = req.params.id;
  const profile = new Profile({ id });
  profile
    .getCreationPromise()
    .then((result) => {
      // console.log(result);
      profile.trainModel();
      res.json({ msg: `Training model for profile ${id}.` });
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({
        msg: `Unable to train model for profile ${id}.`,
      });
    });
});

router.get("/:profileId/models/:operationId", (req, res) => {
  // get status of model trainning using operationId
});

module.exports = router;
