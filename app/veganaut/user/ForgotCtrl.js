(function(module) {
    'use strict';

    module.controller('ForgotCtrl', [
        '$scope', '$translate', 'backendService', 'alertService',
        function($scope, $translate, backendService, alertService) {
            if (backendService.isLoggedIn()) {
                $scope.goToView('');
            }

            $scope.submit = function() {
                backendService.sendPasswordResetMail($scope.form.email)
                    .success(function() {
                        alertService.addAlert($translate.instant('message.resetPassword.emailSent'), 'success');
                    })
                    .error(function(response) {
                        alertService.addAlert(response.error, 'danger');
                    })
                ;

            };
        }
    ]);
})(window.veganaut.userModule);
