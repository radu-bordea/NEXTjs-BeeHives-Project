// Import the `useSWR` hook from the SWR library. SWR is used for data fetching
// and caching in React applications. It helps manage asynchronous data.
import useSWR from "swr";

// Define a fetcher function that will be used by SWR to fetch data from a URL.
// It takes a `url` as a parameter, performs a fetch request to the URL, and
// parses the response as JSON to return the data.
const fetcher = (url) => fetch(url).then((res) => res.json());

// Define a custom hook named `useScales` that encapsulates the logic for fetching
// and managing the "scales" data. This hook will be used by React components to
// get the scales data and handle loading and error states.
export default function useScales() {
  // Use the `useSWR` hook to fetch data from the `/api/scales` endpoint.
  // `useSWR` takes the following arguments:
  // 1. The URL to fetch data from (`"/api/scales"`).
  // 2. The `fetcher` function, which specifies how to fetch and handle the data.
  // 3. An options object, which can be used to configure how SWR behaves.
  //    In this case, `revalidateOnFocus: false` prevents SWR from re-fetching
  //    data when the user switches tabs (focuses the window).
const { data, error, isLoading } = useSWR("/api/scales", fetcher, {
  revalidateOnFocus: true, // Re-fetch when the tab comes into focus
  revalidateOnReconnect: true, // Re-fetch when the user reconnects to the internet
  dedupingInterval: 0, // Disable deduplication, forcing a new request every time
});


  // Return an object containing:
  // 1. `scales`: If the data is available, it will return `data.scales` (assumed to be an array).
  //    If the data is not yet loaded or the property `scales` doesn't exist, it returns an empty array `[]`.
  // 2. `isLoading`: A boolean that is true when the data is being fetched.
  // 3. `isError`: If there is an error during the fetch operation, this will contain the error object.
  return {
    scales: data?.scales || [], // If data is available, return `data.scales`. Otherwise, return an empty array.
    isLoading, // Pass the loading state to indicate if the request is in progress.
    isError: error, // Pass the error object, if any, to indicate if an error occurred during the fetch.
  };
}
