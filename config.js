// Site configuration. Fill these in after publishing your Google Sheets (see README.md).
window.VINYL_CONFIG = {
  siteTitle: "Vinyl Listening Hangout",
  tagline: "Slow, chill, vinyl only.",
  // "File > Share > Publish to web" > pick the Records tab > CSV. Leave empty to use sample-records.csv.
  recordsCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXNUq9gOknnUFFbzkJ8qIwu4i7Tsq9OALwXoxYrx1Y_893ul8VzkDRpFpVSY43SrClqCoPJ7fjrN6e/pub?gid=0&single=true&output=csv",
  // Same, for the Picks tab. Leave empty to keep picks in this browser only.
  picksCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQXNUq9gOknnUFFbzkJ8qIwu4i7Tsq9OALwXoxYrx1Y_893ul8VzkDRpFpVSY43SrClqCoPJ7fjrN6e/pub?gid=741212359&single=true&output=csv",
  // Google Apps Script web app URL (see README.md). Leave empty to keep picks in this browser only.
  picksPostUrl: "https://script.google.com/macros/s/AKfycbyg0tFYcpb8IfsTv1qQD5x449_ij2vG42H8VUUsTlOvKAyjzYVDqI_iyvps7a-ZUHStxg/exec",
  fallbackCsv: "sample-records.csv",
  coversDir: "covers/"
};
