
<?php
echo apache_request_headers()['OIDC_CLAIM_preferred_username'];
echo "#";
echo apache_request_headers()['OIDC_CLAIM_name'];
// print_r(apache_request_headers());
  // foreach( apache_request_headers() as $h=>$v)
  //   if ( (strncmp($h, "OIDC", 4) === 0) && (strlen($v) > 0) ) {
  //     echo "<pre>$h";
  //     if ( strlen($v) < 5 ) {
  //      // echo "<pre>{$v}";
  //     }
  //     else {
  //      echo substr($v,0,80) . "...";
  //     }
  //     echo " ";
  //   }
?>