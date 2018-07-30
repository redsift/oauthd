var me = {
    fetch: [

        function(fetched_elts) {
            return '/beta/me';
        }

    ],
    params: {},
    fields: {
        name: '=',
        firstname: 'givenName',
        lastname: 'surname',
        email: 'userPrincipalName',
        phones: function(me) {
            return {
                business: me.businessPhones,
                mobile: me.mobilePhone,
            };
        }
    }
};
module.exports = me;