import { marshall } from "@aws-sdk/util-dynamodb";
import { MovieReview } from "./types";

export const generateMovieReviewItem = (movieReview: MovieReview) => {
  return {
    PutRequest: {
      Item: marshall(movieReview),
    },
  };
};

export const generateBatch = (data: MovieReview[]) => {
  return data.map((review) => {
    return generateMovieReviewItem(review);
  });
};
