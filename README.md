# Copy files from FTP to FTP

A simple CLI tool to copy files from one FTP server to another without downloading them locally.

## Setup

The tool reads the configuration from environment variables. See `example.env` for a sample configuration.

1. Clone this repository
2. Copy `example.env` and rename it to your needs, e.g. `test.env`
3. Build the container by running

    ```sh
    docker build -t ftp-copy .
    ```
4. And finally run the container with

    ```sh
    docker run --env-file ./test.env -t ftp-copy
    ```

### Environment variables

| Environment variable | Description |
| --- | --- |
| `SOURCE_HOST` | IP or hostname of the source FTP server |
| `SOURCE_USER` | Username of the source FTP server |
| `SOURCE_PASS` | Password of the source FTP server |
| `SOURCE_FOLDER` | Path to the folder containing the files that should be copied e.g. `/my/folder` |
| `SOURCE_EXTENSIONS` | Comma separated list of file extensions that should be copied e.g. `jpg,jpeg,mp4` |
| `DEST_HOST` | IP or hostname of the destination FTP server |
| `DEST_USER` | Username of the destination FTP server |
| `DEST_PASS` | Password of the destination FTP server |
| `DEST_FOLDER` | Path to the folder where the files should be copied to |