# OpenAPI\Client\DefaultApi

All URIs are relative to http://localhost, except if the operation defines another base path.

| Method | HTTP request | Description |
| ------------- | ------------- | ------------- |
| [**apiAlbumsPlaycountDescGet()**](DefaultApi.md#apiAlbumsPlaycountDescGet) | **GET** /api/albums/playcount/desc | Get a list of albums sorted by play count in descending order |


## `apiAlbumsPlaycountDescGet()`

```php
apiAlbumsPlaycountDescGet(): \OpenAPI\Client\Model\ApiAlbumsPlaycountDescGet200ResponseInner[]
```

Get a list of albums sorted by play count in descending order

### Example

```php
<?php
require_once(__DIR__ . '/vendor/autoload.php');



$apiInstance = new OpenAPI\Client\Api\DefaultApi(
    // If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
    // This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client()
);

try {
    $result = $apiInstance->apiAlbumsPlaycountDescGet();
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling DefaultApi->apiAlbumsPlaycountDescGet: ', $e->getMessage(), PHP_EOL;
}
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**\OpenAPI\Client\Model\ApiAlbumsPlaycountDescGet200ResponseInner[]**](../Model/ApiAlbumsPlaycountDescGet200ResponseInner.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`

[[Back to top]](#) [[Back to API list]](../../README.md#endpoints)
[[Back to Model list]](../../README.md#models)
[[Back to README]](../../README.md)
